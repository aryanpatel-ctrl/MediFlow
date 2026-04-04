const mongoose = require('mongoose');
const { Queue, Appointment, Doctor, Notification, User, Hospital, NotificationQueue } = require('../models');
const { QueueError } = require('../models/Queue');
const { sendPushNotification, sendSMS } = require('./notificationService');
const { queueCriticalNotification, queueNotification } = require('./notificationProcessor');
const mlService = require('./mlService');

// Configuration constants
const CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 100,
  IDEMPOTENCY_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  MAX_QUEUE_SIZE: 200,
  DEFAULT_CONSULTATION_TIME: 15
};

/**
 * Generate a unique operation ID for idempotency
 */
function generateOperationId(operation, doctorId, timestamp = Date.now()) {
  return `${operation}:${doctorId}:${timestamp}`;
}

/**
 * Check if operation was recently performed (idempotency check)
 */
async function checkIdempotency(queue, operationId) {
  if (!queue.lastOperationId || !queue.lastOperationAt) {
    return false; // No previous operation
  }

  const isExpired = Date.now() - queue.lastOperationAt.getTime() > CONFIG.IDEMPOTENCY_WINDOW_MS;
  if (isExpired) {
    return false;
  }

  return queue.lastOperationId === operationId;
}

/**
 * Retry wrapper for handling optimistic locking conflicts
 */
async function withRetry(operation, maxAttempts = CONFIG.MAX_RETRY_ATTEMPTS) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if it's a version conflict error
      if (error.name === 'VersionError' || error.code === 'VERSION_CONFLICT') {
        console.log(`Retry attempt ${attempt}/${maxAttempts} due to version conflict`);

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS * attempt));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Get today's date at midnight (for consistent date queries)
 */
function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Initialize queue for a doctor for today
 * Uses atomic findOneAndUpdate to prevent race conditions
 */
async function initializeQueue(doctorId) {
  const today = getTodayDate();

  return withRetry(async () => {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new QueueError('Doctor not found', 'DOCTOR_NOT_FOUND', 404);
    }

    // ATOMIC: Use findOneAndUpdate with upsert to prevent race condition
    // This is a single atomic operation - no TOCTOU race possible
    let queue = await Queue.findOneAndUpdate(
      { doctorId, date: today },
      {
        $setOnInsert: {
          doctorId,
          hospitalId: doctor.hospitalId,
          date: today,
          status: 'not_started',
          entries: [],
          version: 0,
          completedPatients: 0,
          noShowPatients: 0,
          currentIndex: -1
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    // Check if this queue was just created (no entries yet)
    const isNewQueue = queue.entries.length === 0;

    if (isNewQueue) {
      // Start a session for adding appointments to queue
      const session = await mongoose.startSession();

      try {
        session.startTransaction();

        // Reload queue within transaction for consistency
        queue = await Queue.findById(queue._id).session(session);

        // Add all today's appointments to queue
        const appointments = await Appointment.find({
          doctorId,
          date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
          status: { $nin: ['cancelled', 'no_show', 'rescheduled'] }
        }).sort({ slotTime: 1 }).session(session);

        for (const apt of appointments) {
          try {
            // Check if already in queue (idempotent)
            const alreadyInQueue = queue.entries.some(
              e => e.appointmentId?.toString() === apt._id.toString()
            );

            if (!alreadyInQueue) {
              const queueNumber = queue.addPatient(
                apt._id,
                apt.patientId,
                apt.slotTime,
                apt.triageData?.urgencyScore || 3
              );
              apt.queueNumber = queueNumber;
              await apt.save({ session });
            }
          } catch (error) {
            // Skip if appointment already in queue
            if (error.code !== 'DUPLICATE_APPOINTMENT') {
              throw error;
            }
          }
        }

        await queue.save({ session });
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        // Don't throw - queue was created, just appointments weren't added
        console.error('Error adding appointments to queue:', error.message);
      } finally {
        session.endSession();
      }
    }

    return queue;
  });
}

/**
 * Call next patient in queue (with transaction and conflict handling)
 */
async function callNextPatient(doctorId, operationId = null) {
  const today = getTodayDate();
  operationId = operationId || generateOperationId('callNext', doctorId);

  return withRetry(async () => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const queue = await Queue.findOne({ doctorId, date: today })
        .populate('entries.patientId', 'name phone fcmToken notificationPreferences')
        .populate('entries.appointmentId')
        .session(session);

      if (!queue) {
        throw new QueueError('No queue found for today', 'QUEUE_NOT_FOUND', 404);
      }

      // Check idempotency
      if (await checkIdempotency(queue, operationId)) {
        await session.abortTransaction();
        return {
          message: 'Operation already performed (idempotent)',
          idempotent: true,
          summary: queue.getSummary()
        };
      }

      if (queue.status !== 'active') {
        throw new QueueError('Queue is not active', 'QUEUE_NOT_ACTIVE');
      }

      // Complete current patient if exists
      if (queue.currentIndex >= 0 && queue.currentIndex < queue.entries.length) {
        const currentEntry = queue.entries[queue.currentIndex];
        if (currentEntry && currentEntry.status === 'in_consultation') {
          const now = new Date();

          // Calculate actual wait time safely
          let actualWaitTime = null;
          if (currentEntry.checkInTime && currentEntry.consultationStartTime) {
            actualWaitTime = Math.round(
              (currentEntry.consultationStartTime - currentEntry.checkInTime) / (1000 * 60)
            );
          }

          // Calculate consultation duration safely
          let duration = null;
          if (currentEntry.consultationStartTime) {
            duration = Math.round((now - currentEntry.consultationStartTime) / (1000 * 60));
          }

          currentEntry.status = 'completed';
          currentEntry.consultationEndTime = now;
          currentEntry.actualWaitTime = actualWaitTime;
          currentEntry.lastModified = now;

          queue.completedPatients++;

          // Update appointment
          await Appointment.findByIdAndUpdate(
            currentEntry.appointmentId,
            {
              status: 'completed',
              consultationEndTime: now,
              actualWaitTime: actualWaitTime,
              actualConsultationDuration: duration
            },
            { session }
          );
        }
      }

      // Get next patient
      const nextPatient = queue.getNextPatient();

      if (!nextPatient) {
        queue.currentIndex = -1;
        queue.currentPatientId = null;
        queue.lastOperationId = operationId;
        queue.lastOperationAt = new Date();

        await queue.save({ session });
        await session.commitTransaction();

        return {
          message: 'No more patients in queue',
          patient: null,
          summary: queue.getSummary()
        };
      }

      // Find the index of the next patient
      const nextIndex = queue.entries.findIndex(
        e => e._id.toString() === nextPatient._id.toString()
      );

      if (nextIndex === -1) {
        throw new QueueError('Next patient not found in entries', 'ENTRY_NOT_FOUND');
      }

      // Update next patient status
      const now = new Date();
      queue.entries[nextIndex].status = 'in_consultation';
      queue.entries[nextIndex].callTime = now;
      queue.entries[nextIndex].consultationStartTime = now;
      queue.entries[nextIndex].lastModified = now;

      queue.currentIndex = nextIndex;
      queue.currentPatientId = nextPatient.patientId;
      queue.lastOperationId = operationId;
      queue.lastOperationAt = now;

      // Update appointment
      await Appointment.findByIdAndUpdate(
        nextPatient.appointmentId,
        {
          status: 'in_progress',
          consultationStartTime: now
        },
        { session }
      );

      // Recalculate wait times
      await recalculateMLWaitTimes(queue);

      await queue.save({ session });
      await session.commitTransaction();

      // After transaction success, send notifications (outside transaction)
      setImmediate(async () => {
        try {
          await sendPatientNotifications(nextPatient, queue, 'your_turn');
          await notifyUpcomingPatients(queue);
          await updateAverageConsultationTime(doctorId);
        } catch (notifError) {
          console.error('Notification error (non-critical):', notifError.message);
        }
      });

      return {
        message: 'Next patient called',
        patient: {
          queueNumber: nextPatient.queueNumber,
          patientId: nextPatient.patientId?._id || nextPatient.patientId,
          name: nextPatient.patientId?.name,
          appointmentId: nextPatient.appointmentId?._id || nextPatient.appointmentId
        },
        summary: queue.getSummary()
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

/**
 * Complete current patient consultation (with transaction)
 */
async function completeCurrentPatient(doctorId, notes = null) {
  const today = getTodayDate();

  return withRetry(async () => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const queue = await Queue.findOne({ doctorId, date: today }).session(session);

      if (!queue) {
        throw new QueueError('No queue found', 'QUEUE_NOT_FOUND', 404);
      }

      if (queue.currentIndex < 0 || queue.currentIndex >= queue.entries.length) {
        throw new QueueError('No patient currently in consultation', 'NO_CURRENT_PATIENT');
      }

      const currentEntry = queue.entries[queue.currentIndex];

      if (currentEntry.status !== 'in_consultation') {
        throw new QueueError('Current patient is not in consultation', 'INVALID_STATE');
      }

      const now = new Date();

      // Calculate duration safely
      let duration = null;
      if (currentEntry.consultationStartTime) {
        duration = Math.round((now - currentEntry.consultationStartTime) / (1000 * 60));
      }

      // Calculate actual wait time safely
      let actualWaitTime = null;
      if (currentEntry.checkInTime && currentEntry.consultationStartTime) {
        actualWaitTime = Math.round(
          (currentEntry.consultationStartTime - currentEntry.checkInTime) / (1000 * 60)
        );
      }

      currentEntry.status = 'completed';
      currentEntry.consultationEndTime = now;
      currentEntry.actualWaitTime = actualWaitTime;
      currentEntry.lastModified = now;

      queue.completedPatients++;
      queue.currentIndex = -1;
      queue.currentPatientId = null;

      // Update appointment
      const updateData = {
        status: 'completed',
        consultationEndTime: now,
        actualWaitTime: actualWaitTime,
        actualConsultationDuration: duration
      };

      if (notes) {
        updateData['doctorNotes.notes'] = notes;
      }

      await Appointment.findByIdAndUpdate(
        currentEntry.appointmentId,
        updateData,
        { session }
      );

      // Update user stats
      await User.findByIdAndUpdate(
        currentEntry.patientId,
        { $inc: { totalAppointments: 1 } },
        { session }
      );

      await queue.save({ session });
      await session.commitTransaction();

      // Send feedback request (outside transaction)
      setImmediate(async () => {
        try {
          await sendFeedbackRequest(currentEntry);
          await updateAverageConsultationTime(doctorId);
        } catch (error) {
          console.error('Post-completion notification error:', error.message);
        }
      });

      return {
        message: 'Patient consultation completed',
        summary: queue.getSummary()
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

/**
 * Skip current patient (no show or stepped out)
 */
async function skipPatient(doctorId, reason, markAsNoShow = false) {
  const today = getTodayDate();

  return withRetry(async () => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const queue = await Queue.findOne({ doctorId, date: today }).session(session);

      if (!queue) {
        throw new QueueError('No queue found', 'QUEUE_NOT_FOUND', 404);
      }

      // Find first waiting patient
      const waitingIndex = queue.entries.findIndex(e => e.status === 'waiting');

      if (waitingIndex === -1) {
        throw new QueueError('No waiting patients to skip', 'NO_WAITING_PATIENTS');
      }

      const entry = queue.entries[waitingIndex];
      const now = new Date();

      entry.status = markAsNoShow ? 'no_show' : 'skipped';
      entry.notes = reason;
      entry.lastModified = now;

      if (markAsNoShow) {
        queue.noShowPatients++;

        // Update appointment
        await Appointment.findByIdAndUpdate(
          entry.appointmentId,
          { status: 'no_show' },
          { session }
        );

        // Update user no-show count
        await User.findByIdAndUpdate(
          entry.patientId,
          { $inc: { noShowCount: 1 } },
          { session }
        );
      }

      await recalculateMLWaitTimes(queue);
      await queue.save({ session });
      await session.commitTransaction();

      return {
        message: markAsNoShow ? 'Patient marked as no-show' : 'Patient skipped',
        summary: queue.getSummary()
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

/**
 * Auto-detect no-shows based on configurable timeout
 * Called periodically by a scheduler/cron job
 */
async function autoDetectNoShows(hospitalId = null) {
  const today = getTodayDate();
  const now = new Date();

  // Build query
  const queueQuery = { date: today, status: 'active' };
  if (hospitalId) {
    queueQuery.hospitalId = new mongoose.Types.ObjectId(hospitalId);
  }

  const results = {
    processed: 0,
    noShowsDetected: 0,
    details: [],
    errors: []
  };

  try {
    const queues = await Queue.find(queueQuery)
      .populate('hospitalId', 'autoNoShowAfter autoNoShowEnabled');

    for (const queue of queues) {
      const session = await mongoose.startSession();

      try {
        session.startTransaction();

        const hospital = queue.hospitalId;

        // Check if auto no-show detection is enabled
        if (!hospital?.autoNoShowEnabled) {
          continue;
        }

        const autoNoShowMinutes = hospital.autoNoShowAfter || 30;
        let queueModified = false;

        // Find waiting patients whose slot time has passed
        for (const entry of queue.entries) {
          if (entry.status !== 'waiting') continue;

          // Parse slot time safely
          const slotTimeParts = (entry.slotTime || '09:00').split(':');
          const hours = parseInt(slotTimeParts[0], 10) || 9;
          const minutes = parseInt(slotTimeParts[1], 10) || 0;

          const slotDateTime = new Date(today);
          slotDateTime.setHours(hours, minutes, 0, 0);

          const minutesSinceSlot = Math.floor((now - slotDateTime) / (1000 * 60));

          // Check if patient hasn't checked in and time exceeded
          if (minutesSinceSlot > autoNoShowMinutes && !entry.checkInTime) {
            entry.status = 'no_show';
            entry.notes = `Auto-detected no-show (${minutesSinceSlot} mins past slot time)`;
            entry.lastModified = now;

            queue.noShowPatients++;
            queueModified = true;

            // Update appointment
            await Appointment.findByIdAndUpdate(
              entry.appointmentId,
              {
                status: 'no_show',
                noShowDetectedAt: now,
                noShowReason: 'auto_detected'
              },
              { session }
            );

            // Update user no-show count
            await User.findByIdAndUpdate(
              entry.patientId,
              { $inc: { noShowCount: 1 } },
              { session }
            );

            results.noShowsDetected++;
            results.details.push({
              queueId: queue._id,
              patientId: entry.patientId,
              appointmentId: entry.appointmentId,
              slotTime: entry.slotTime,
              minutesPast: minutesSinceSlot
            });

            // Send notification (async, non-blocking)
            setImmediate(async () => {
              try {
                await sendNoShowNotification(entry, autoNoShowMinutes);
              } catch (err) {
                console.error('No-show notification failed:', err.message);
              }
            });
          }
        }

        if (queueModified) {
          await recalculateMLWaitTimes(queue);
          await queue.save({ session });
        }

        await session.commitTransaction();
        results.processed++;
      } catch (error) {
        await session.abortTransaction();
        results.errors.push({
          queueId: queue._id,
          error: error.message
        });
      } finally {
        session.endSession();
      }
    }
  } catch (error) {
    console.error('Auto no-show detection error:', error);
    results.errors.push({ error: error.message });
  }

  return results;
}

/**
 * Proactive no-show risk alerts for upcoming appointments
 */
async function getNoShowRiskAlerts(hospitalId, date = new Date()) {
  try {
    const highRiskAppointments = await mlService.identifyHighRiskAppointments(date, 0.3);

    const alerts = {
      high: [],
      medium: [],
      total: highRiskAppointments?.length || 0
    };

    for (const risk of (highRiskAppointments || [])) {
      const alertData = {
        appointmentId: risk.appointment?._id,
        patientName: risk.appointment?.patientId?.name,
        patientId: risk.appointment?.patientId?._id,
        slotTime: risk.appointment?.slotTime,
        doctorId: risk.appointment?.doctorId,
        noShowProbability: risk.noShowProbability,
        historicalNoShows: risk.appointment?.patientId?.noShowCount || 0,
        totalAppointments: risk.appointment?.patientId?.totalAppointments || 0,
        interventions: risk.recommendedInterventions || []
      };

      if (risk.riskLevel === 'high') {
        alerts.high.push(alertData);
      } else {
        alerts.medium.push(alertData);
      }
    }

    return alerts;
  } catch (error) {
    console.error('No-show risk alerts error:', error);
    return { high: [], medium: [], total: 0, error: error.message };
  }
}

/**
 * Add walk-in patient to queue
 */
async function addWalkIn(doctorId, patientId, triageData) {
  const today = getTodayDate();

  return withRetry(async () => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      let queue = await Queue.findOne({ doctorId, date: today }).session(session);

      if (!queue) {
        // Initialize queue first
        await session.abortTransaction();
        session.endSession();
        queue = await initializeQueue(doctorId);

        // Start new session for walk-in
        const newSession = await mongoose.startSession();
        try {
          newSession.startTransaction();
          queue = await Queue.findOne({ doctorId, date: today }).session(newSession);

          return await processWalkIn(queue, doctorId, patientId, triageData, newSession);
        } catch (error) {
          await newSession.abortTransaction();
          throw error;
        } finally {
          newSession.endSession();
        }
      }

      return await processWalkIn(queue, doctorId, patientId, triageData, session);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

async function processWalkIn(queue, doctorId, patientId, triageData, session) {
  // Check queue capacity
  if (queue.entries.length >= CONFIG.MAX_QUEUE_SIZE) {
    throw new QueueError('Queue is at maximum capacity', 'QUEUE_FULL');
  }

  const doctor = await Doctor.findById(doctorId).session(session);
  if (!doctor) {
    throw new QueueError('Doctor not found', 'DOCTOR_NOT_FOUND', 404);
  }

  const now = new Date();

  // Create walk-in appointment
  const appointment = await Appointment.create([{
    patientId,
    doctorId,
    hospitalId: doctor.hospitalId,
    date: getTodayDate(),
    slotTime: now.toTimeString().slice(0, 5),
    appointmentType: 'Walk-in',
    status: 'checked_in',
    bookingSource: 'walk_in',
    triageData,
    checkInTime: now
  }], { session });

  const apt = appointment[0];

  // Add to queue
  const queueNumber = queue.addPatient(
    apt._id,
    patientId,
    apt.slotTime,
    triageData?.urgencyScore || 3
  );

  // Mark as checked in
  const entry = queue.entries[queue.entries.length - 1];
  entry.checkInTime = now;

  await recalculateMLWaitTimes(queue);
  await queue.save({ session });

  apt.queueNumber = queueNumber;
  await apt.save({ session });

  await session.commitTransaction();

  return {
    appointment: apt,
    queueNumber,
    estimatedWait: queue.getEstimatedWait(queue.entries.length),
    summary: queue.getSummary()
  };
}

/**
 * ML-enhanced wait time recalculation
 */
async function recalculateMLWaitTimes(queue) {
  const waitingEntries = queue.entries.filter(e => e.status === 'waiting');

  if (waitingEntries.length === 0) return;

  try {
    const mlResult = await mlService.getMLWaitTimes(
      waitingEntries,
      queue.avgConsultationTime || CONFIG.DEFAULT_CONSULTATION_TIME,
      queue.currentDelay || 0
    );

    if (mlResult?.success && mlResult.waitTimes) {
      for (const prediction of mlResult.waitTimes) {
        const entry = queue.entries.find(e => e._id?.toString() === prediction.entryId);
        if (entry) {
          entry.estimatedWaitTime = prediction.estimatedWait;
          entry.noShowProbability = prediction.noShowProbability;
          entry.predictedDuration = prediction.predictedDuration;
        }
      }
      return;
    }
  } catch (error) {
    console.error('ML wait time prediction failed, using fallback:', error.message);
  }

  // Fallback: standard calculation
  queue.recalculateWaitTimes();
}

/**
 * Update average consultation time based on completed appointments
 */
async function updateAverageConsultationTime(doctorId) {
  try {
    const today = getTodayDate();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: weekAgo },
      status: 'completed',
      actualConsultationDuration: { $exists: true, $gt: 0, $lt: 180 } // Filter outliers
    }).select('actualConsultationDuration');

    if (appointments.length > 0) {
      const totalDuration = appointments.reduce(
        (sum, apt) => sum + apt.actualConsultationDuration, 0
      );
      const avgDuration = Math.round(totalDuration / appointments.length);

      await Doctor.findByIdAndUpdate(doctorId, {
        avgConsultationTime: avgDuration
      });

      // Update today's queue
      const queue = await Queue.findOne({ doctorId, date: today });
      if (queue) {
        queue.avgConsultationTime = avgDuration;
        await recalculateMLWaitTimes(queue);
        await queue.save();
      }
    }
  } catch (error) {
    console.error('Update avg consultation time error:', error.message);
  }
}

/**
 * Get real-time queue status for display
 */
async function getQueueDisplay(doctorId) {
  const today = getTodayDate();

  try {
    const queue = await Queue.findOne({ doctorId, date: today })
      .populate('entries.patientId', 'name')
      .populate('currentPatientId', 'name');

    if (!queue) {
      return {
        status: 'not_started',
        currentPatient: null,
        waitingList: [],
        stats: { waiting: 0, completed: 0, noShow: 0 }
      };
    }

    const waitingList = queue.entries
      .filter(e => e.status === 'waiting')
      .sort((a, b) => a.position - b.position)
      .map(e => ({
        queueNumber: e.queueNumber,
        name: e.patientId?.name,
        estimatedWait: e.estimatedWaitTime,
        urgency: e.urgencyScore,
        noShowRisk: e.noShowProbability ?
          (e.noShowProbability >= 0.5 ? 'high' : e.noShowProbability >= 0.3 ? 'medium' : 'low')
          : null
      }));

    const currentPatient = queue.currentIndex >= 0 && queue.currentIndex < queue.entries.length
      ? {
          queueNumber: queue.entries[queue.currentIndex].queueNumber,
          name: queue.currentPatientId?.name
        }
      : null;

    return {
      status: queue.status,
      currentPatient,
      currentDelay: queue.currentDelay,
      waitingList: waitingList.slice(0, 10),
      stats: queue.getSummary()
    };
  } catch (error) {
    console.error('Get queue display error:', error);
    return {
      status: 'error',
      error: error.message,
      currentPatient: null,
      waitingList: [],
      stats: { waiting: 0, completed: 0, noShow: 0 }
    };
  }
}

/**
 * Check in patient
 */
async function checkInPatient(appointmentId) {
  const today = getTodayDate();

  return withRetry(async () => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const appointment = await Appointment.findById(appointmentId).session(session);
      if (!appointment) {
        throw new QueueError('Appointment not found', 'APPOINTMENT_NOT_FOUND', 404);
      }

      if (['cancelled', 'no_show', 'completed'].includes(appointment.status)) {
        throw new QueueError(
          `Cannot check in: appointment is ${appointment.status}`,
          'INVALID_APPOINTMENT_STATUS'
        );
      }

      const queue = await Queue.findOne({
        doctorId: appointment.doctorId,
        date: today
      }).session(session);

      if (!queue) {
        throw new QueueError('Queue not found', 'QUEUE_NOT_FOUND', 404);
      }

      const entry = queue.entries.find(
        e => e.appointmentId?.toString() === appointmentId.toString()
      );

      if (!entry) {
        throw new QueueError('Patient not in queue', 'NOT_IN_QUEUE');
      }

      if (entry.checkInTime) {
        throw new QueueError('Patient already checked in', 'ALREADY_CHECKED_IN');
      }

      const now = new Date();
      entry.checkInTime = now;
      entry.lastModified = now;

      appointment.status = 'checked_in';
      appointment.checkInTime = now;

      await Promise.all([
        queue.save({ session }),
        appointment.save({ session })
      ]);

      await session.commitTransaction();

      return {
        message: 'Patient checked in successfully',
        queueNumber: entry.queueNumber,
        position: queue.entries.filter(
          e => e.status === 'waiting' && e.position < entry.position
        ).length + 1,
        estimatedWait: entry.estimatedWaitTime
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

/**
 * Cancel appointment and update queue
 */
async function cancelAppointmentInQueue(appointmentId, reason = 'Cancelled by patient') {
  const today = getTodayDate();

  return withRetry(async () => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const appointment = await Appointment.findById(appointmentId).session(session);
      if (!appointment) {
        throw new QueueError('Appointment not found', 'APPOINTMENT_NOT_FOUND', 404);
      }

      const queue = await Queue.findOne({
        doctorId: appointment.doctorId,
        date: today
      }).session(session);

      // Update queue if exists
      if (queue) {
        const entry = queue.cancelEntry(appointmentId, reason);
        if (entry) {
          await recalculateMLWaitTimes(queue);
          await queue.save({ session });
        }
      }

      // Update appointment
      appointment.status = 'cancelled';
      appointment.cancellationReason = reason;
      await appointment.save({ session });

      await session.commitTransaction();

      return {
        message: 'Appointment cancelled successfully',
        summary: queue?.getSummary() || null
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

/**
 * Get queue health status
 */
async function getQueueHealth(doctorId) {
  const today = getTodayDate();

  try {
    const queue = await Queue.findOne({ doctorId, date: today });

    if (!queue) {
      return { status: 'no_queue', healthy: true };
    }

    const issues = [];

    // Check for orphaned entries (appointments that were cancelled)
    const appointmentIds = queue.entries.map(e => e.appointmentId);
    const appointments = await Appointment.find({
      _id: { $in: appointmentIds },
      status: { $in: ['cancelled', 'rescheduled'] }
    });

    if (appointments.length > 0) {
      issues.push({
        type: 'orphaned_entries',
        count: appointments.length,
        message: 'Queue contains cancelled/rescheduled appointments'
      });
    }

    // Check for counter drift
    const actualCompleted = queue.entries.filter(e => e.status === 'completed').length;
    const actualNoShow = queue.entries.filter(e => e.status === 'no_show').length;

    if (queue.completedPatients !== actualCompleted) {
      issues.push({
        type: 'counter_drift',
        field: 'completedPatients',
        expected: actualCompleted,
        actual: queue.completedPatients
      });
    }

    if (queue.noShowPatients !== actualNoShow) {
      issues.push({
        type: 'counter_drift',
        field: 'noShowPatients',
        expected: actualNoShow,
        actual: queue.noShowPatients
      });
    }

    // Check currentIndex validity
    if (queue.currentIndex >= queue.entries.length) {
      issues.push({
        type: 'invalid_index',
        message: 'currentIndex exceeds entries length'
      });
    }

    return {
      status: queue.status,
      healthy: issues.length === 0,
      issues,
      stats: queue.getSummary(),
      version: queue.version
    };
  } catch (error) {
    return {
      status: 'error',
      healthy: false,
      error: error.message
    };
  }
}

// Helper functions for notifications - Using reliable notification queue
async function sendPatientNotifications(patient, queue, type) {
  try {
    const patientId = patient.patientId?._id || patient.patientId;
    const appointmentId = patient.appointmentId?._id || patient.appointmentId;
    const doctorId = queue.doctorId;

    // Create in-app notification
    await Notification.createQueueNotification(patientId, type, appointmentId);

    // Queue reliable notification (with retry support)
    const notificationData = {
      userId: patientId,
      type: type,
      title: type === 'your_turn' ? "It's Your Turn!" : 'Queue Update',
      body: type === 'your_turn'
        ? 'Please proceed to the consultation room immediately.'
        : `You're #${patient.queueNumber} in queue. Estimated wait: ${patient.estimatedWaitTime || 'N/A'} mins`,
      data: {
        type,
        appointmentId: appointmentId?.toString(),
        queueNumber: String(patient.queueNumber),
        doctorId: doctorId?.toString()
      },
      relatedTo: {
        appointmentId,
        doctorId,
        hospitalId: queue.hospitalId,
        queueId: queue._id
      },
      idempotencyKey: `${type}:${appointmentId}:${Date.now()}`,
      context: { source: 'queueManager' }
    };

    // Critical notifications (your_turn) get higher priority and multi-channel
    if (type === 'your_turn') {
      await queueCriticalNotification(notificationData);
    } else {
      await queueNotification(notificationData);
    }
  } catch (error) {
    console.error('[QueueManager] Send patient notification error:', error.message);
    // Error is logged but notification is already queued for retry
  }
}

async function notifyUpcomingPatients(queue) {
  const upcomingPatients = queue.entries
    .filter(e => e.status === 'waiting')
    .sort((a, b) => a.position - b.position)
    .slice(0, 2);

  for (const entry of upcomingPatients) {
    const position = queue.entries.filter(
      e => e.status === 'waiting' && e.position < entry.position
    ).length + 1;

    try {
      const patientId = entry.patientId?._id || entry.patientId;
      const appointmentId = entry.appointmentId?._id || entry.appointmentId;

      // Create in-app notification
      await Notification.createQueueNotification(
        patientId,
        'queue_update',
        appointmentId,
        { position, waitTime: entry.estimatedWaitTime }
      );

      // Queue reliable notification
      await queueNotification({
        userId: patientId,
        type: 'queue_update',
        channels: ['push'],
        title: 'Queue Update',
        body: `You're #${position} in queue. Estimated wait: ${entry.estimatedWaitTime || 'N/A'} mins`,
        data: {
          type: 'queue_update',
          appointmentId: appointmentId?.toString(),
          position: String(position),
          waitTime: String(entry.estimatedWaitTime || 0)
        },
        relatedTo: {
          appointmentId,
          doctorId: queue.doctorId,
          hospitalId: queue.hospitalId
        },
        priority: 5,
        idempotencyKey: `queue_update:${appointmentId}:${position}`,
        context: { source: 'queueManager' }
      });
    } catch (error) {
      console.error('[QueueManager] Notify upcoming patient error:', error.message);
    }
  }
}

async function sendFeedbackRequest(entry) {
  try {
    const patientId = entry.patientId?._id || entry.patientId;
    const appointmentId = entry.appointmentId?._id || entry.appointmentId;

    // Create in-app notification
    await Notification.createQueueNotification(patientId, 'feedback_request', appointmentId);

    // Queue reliable notification
    await queueNotification({
      userId: patientId,
      type: 'feedback_request',
      channels: ['push'],
      title: 'How was your visit?',
      body: 'Please take a moment to rate your experience.',
      data: {
        type: 'feedback_request',
        appointmentId: appointmentId?.toString()
      },
      relatedTo: { appointmentId },
      priority: 3,
      idempotencyKey: `feedback:${appointmentId}`,
      context: { source: 'queueManager' }
    });
  } catch (error) {
    console.error('[QueueManager] Send feedback request error:', error.message);
  }
}

async function sendNoShowNotification(entry, autoNoShowMinutes) {
  try {
    const patientId = entry.patientId?._id || entry.patientId;
    const appointmentId = entry.appointmentId?._id || entry.appointmentId;

    // Create in-app notification
    await Notification.createQueueNotification(
      patientId,
      'no_show',
      appointmentId,
      { reason: 'You did not check in for your appointment' }
    );

    // Queue reliable SMS notification
    await queueNotification({
      userId: patientId,
      type: 'no_show',
      channels: ['sms', 'push'],
      title: 'Appointment Missed',
      body: `Your appointment was marked as missed because you didn't check in within ${autoNoShowMinutes} minutes of your slot time. Please reschedule if needed.`,
      data: {
        type: 'no_show',
        appointmentId: appointmentId?.toString()
      },
      relatedTo: { appointmentId },
      priority: 7,
      idempotencyKey: `no_show:${appointmentId}`,
      context: { source: 'queueManager' }
    });
  } catch (error) {
    console.error('[QueueManager] Send no-show notification error:', error.message);
  }
}

module.exports = {
  initializeQueue,
  callNextPatient,
  completeCurrentPatient,
  skipPatient,
  autoDetectNoShows,
  getNoShowRiskAlerts,
  addWalkIn,
  recalculateMLWaitTimes,
  updateAverageConsultationTime,
  getQueueDisplay,
  checkInPatient,
  cancelAppointmentInQueue,
  getQueueHealth,
  generateOperationId,
  QueueError
};

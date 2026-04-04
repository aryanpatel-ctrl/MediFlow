const { Queue, Appointment, Doctor, Notification, User, Hospital } = require('../models');
const { sendPushNotification, sendSMS } = require('./notificationService');
const mlService = require('./mlService');

/**
 * Initialize queue for a doctor for today
 */
async function initializeQueue(doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let queue = await Queue.findOne({ doctorId, date: today });

  if (!queue) {
    const doctor = await Doctor.findById(doctorId);
    queue = await Queue.create({
      doctorId,
      hospitalId: doctor.hospitalId,
      date: today,
      status: 'not_started'
    });

    // Add all today's appointments to queue
    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      status: { $nin: ['cancelled', 'no_show', 'rescheduled'] }
    }).sort({ slotTime: 1 });

    for (const apt of appointments) {
      queue.addPatient(
        apt._id,
        apt.patientId,
        apt.slotTime,
        apt.triageData?.urgencyScore || 3
      );
      apt.queueNumber = queue.totalPatients;
      await apt.save();
    }

    await queue.save();
  }

  return queue;
}

/**
 * Call next patient in queue
 */
async function callNextPatient(doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({ doctorId, date: today })
    .populate('entries.patientId', 'name phone fcmToken notificationPreferences')
    .populate('entries.appointmentId');

  if (!queue) {
    throw new Error('No queue found for today');
  }

  if (queue.status !== 'active') {
    throw new Error('Queue is not active');
  }

  // Complete current patient if exists
  if (queue.currentIndex >= 0) {
    const currentEntry = queue.entries[queue.currentIndex];
    if (currentEntry && currentEntry.status === 'in_consultation') {
      currentEntry.status = 'completed';
      currentEntry.consultationEndTime = new Date();
      currentEntry.actualWaitTime = currentEntry.checkInTime
        ? Math.round((currentEntry.consultationStartTime - currentEntry.checkInTime) / (1000 * 60))
        : null;

      queue.completedPatients++;

      // Update appointment
      await Appointment.findByIdAndUpdate(currentEntry.appointmentId, {
        status: 'completed',
        consultationEndTime: new Date(),
        actualWaitTime: currentEntry.actualWaitTime,
        actualConsultationDuration: currentEntry.consultationStartTime
          ? Math.round((new Date() - currentEntry.consultationStartTime) / (1000 * 60))
          : null
      });
    }
  }

  // Get next patient
  const nextPatient = queue.getNextPatient();

  if (!nextPatient) {
    await queue.save();
    return {
      message: 'No more patients in queue',
      patient: null,
      summary: queue.getSummary()
    };
  }

  // Update next patient status
  const nextIndex = queue.entries.findIndex(
    e => e._id.toString() === nextPatient._id.toString()
  );

  queue.entries[nextIndex].status = 'in_consultation';
  queue.entries[nextIndex].callTime = new Date();
  queue.entries[nextIndex].consultationStartTime = new Date();
  queue.currentIndex = nextIndex;
  queue.currentPatientId = nextPatient.patientId;

  // Update appointment
  await Appointment.findByIdAndUpdate(nextPatient.appointmentId, {
    status: 'in_progress',
    consultationStartTime: new Date()
  });

  // Recalculate wait times with ML enhancement
  await recalculateMLWaitTimes(queue);
  await queue.save();

  // Update average consultation time
  await updateAverageConsultationTime(doctorId);

  // Send notification to patient
  await Notification.createQueueNotification(
    nextPatient.patientId,
    'your_turn',
    nextPatient.appointmentId
  );

  // Send FCM push notification
  const patient = await User.findById(nextPatient.patientId);
  if (patient?.fcmToken && patient.notificationPreferences?.push !== false) {
    await sendPushNotification(patient.fcmToken, {
      title: "It's Your Turn!",
      body: 'Please proceed to the consultation room immediately.',
      data: {
        type: 'your_turn',
        appointmentId: nextPatient.appointmentId.toString(),
        queueNumber: String(nextPatient.queueNumber)
      }
    });
  }

  // Notify next 2 patients that they're coming up
  const upcomingPatients = queue.entries
    .filter(e => e.status === 'waiting')
    .sort((a, b) => a.position - b.position)
    .slice(0, 2);

  for (const entry of upcomingPatients) {
    const position = queue.entries.filter(
      e => e.status === 'waiting' && e.position < entry.position
    ).length + 1;

    await Notification.createQueueNotification(
      entry.patientId,
      'queue_update',
      entry.appointmentId,
      {
        position,
        waitTime: entry.estimatedWaitTime
      }
    );

    // Send FCM push notification for position update
    const upcomingPatient = await User.findById(entry.patientId);
    if (upcomingPatient?.fcmToken && upcomingPatient.notificationPreferences?.push !== false) {
      await sendPushNotification(upcomingPatient.fcmToken, {
        title: 'Queue Update',
        body: `You're #${position} in queue. Estimated wait: ${entry.estimatedWaitTime} mins`,
        data: {
          type: 'queue_update',
          appointmentId: entry.appointmentId.toString(),
          position: String(position),
          waitTime: String(entry.estimatedWaitTime)
        }
      });
    }
  }

  return {
    message: 'Next patient called',
    patient: {
      queueNumber: nextPatient.queueNumber,
      patientId: nextPatient.patientId,
      name: nextPatient.patientId?.name,
      appointmentId: nextPatient.appointmentId
    },
    summary: queue.getSummary()
  };
}

/**
 * Complete current patient consultation
 */
async function completeCurrentPatient(doctorId, notes = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({ doctorId, date: today });

  if (!queue || queue.currentIndex < 0) {
    throw new Error('No patient currently in consultation');
  }

  const currentEntry = queue.entries[queue.currentIndex];
  currentEntry.status = 'completed';
  currentEntry.consultationEndTime = new Date();

  if (currentEntry.consultationStartTime) {
    const duration = Math.round(
      (new Date() - currentEntry.consultationStartTime) / (1000 * 60)
    );
    currentEntry.actualWaitTime = currentEntry.checkInTime
      ? Math.round((currentEntry.consultationStartTime - currentEntry.checkInTime) / (1000 * 60))
      : null;

    // Update appointment
    await Appointment.findByIdAndUpdate(currentEntry.appointmentId, {
      status: 'completed',
      consultationEndTime: new Date(),
      actualWaitTime: currentEntry.actualWaitTime,
      actualConsultationDuration: duration,
      ...(notes && { 'doctorNotes.notes': notes })
    });
  }

  queue.completedPatients++;
  queue.currentIndex = -1;
  queue.currentPatientId = null;

  await queue.save();
  await updateAverageConsultationTime(doctorId);

  // Update user stats
  await User.findByIdAndUpdate(currentEntry.patientId, {
    $inc: { totalAppointments: 1 }
  });

  // Request feedback
  await Notification.createQueueNotification(
    currentEntry.patientId,
    'feedback_request',
    currentEntry.appointmentId
  );

  // Send FCM push for feedback request
  const completedPatient = await User.findById(currentEntry.patientId);
  if (completedPatient?.fcmToken && completedPatient.notificationPreferences?.push !== false) {
    await sendPushNotification(completedPatient.fcmToken, {
      title: 'How was your visit?',
      body: 'Please take a moment to rate your experience.',
      data: {
        type: 'feedback_request',
        appointmentId: currentEntry.appointmentId.toString()
      }
    });
  }

  return {
    message: 'Patient consultation completed',
    summary: queue.getSummary()
  };
}

/**
 * Skip current patient (no show or stepped out)
 */
async function skipPatient(doctorId, reason, markAsNoShow = false) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({ doctorId, date: today });

  if (!queue) {
    throw new Error('No queue found');
  }

  // Find waiting patient to skip
  const waitingPatient = queue.entries.find(e => e.status === 'waiting');

  if (!waitingPatient) {
    throw new Error('No waiting patients to skip');
  }

  waitingPatient.status = markAsNoShow ? 'no_show' : 'skipped';
  waitingPatient.notes = reason;

  if (markAsNoShow) {
    queue.noShowPatients++;

    // Update appointment
    await Appointment.findByIdAndUpdate(waitingPatient.appointmentId, {
      status: 'no_show'
    });

    // Update user no-show count
    await User.findByIdAndUpdate(waitingPatient.patientId, {
      $inc: { noShowCount: 1 }
    });
  }

  await recalculateMLWaitTimes(queue);
  await queue.save();

  return {
    message: markAsNoShow ? 'Patient marked as no-show' : 'Patient skipped',
    summary: queue.getSummary()
  };
}

/**
 * Auto-detect no-shows based on configurable timeout
 * Called periodically by a scheduler/cron job
 */
async function autoDetectNoShows(hospitalId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build query
  const queueQuery = { date: today, status: 'active' };
  if (hospitalId) {
    queueQuery.hospitalId = hospitalId;
  }

  const queues = await Queue.find(queueQuery)
    .populate('hospitalId', 'autoNoShowAfter autoNoShowEnabled');

  const results = {
    processed: 0,
    noShowsDetected: 0,
    details: []
  };

  for (const queue of queues) {
    const hospital = queue.hospitalId;

    // Check if auto no-show detection is enabled
    if (!hospital?.autoNoShowEnabled) {
      continue;
    }

    const autoNoShowMinutes = hospital.autoNoShowAfter || 30; // Default 30 minutes
    const now = new Date();

    // Find waiting patients whose slot time has passed by more than autoNoShowMinutes
    const waitingEntries = queue.entries.filter(e => e.status === 'waiting');

    for (const entry of waitingEntries) {
      // Parse slot time
      const [hours, minutes] = (entry.slotTime || '09:00').split(':').map(Number);
      const slotDateTime = new Date(today);
      slotDateTime.setHours(hours, minutes, 0, 0);

      // Calculate minutes since slot time
      const minutesSinceSlot = Math.floor((now - slotDateTime) / (1000 * 60));

      // Check if patient hasn't checked in and time exceeded
      if (minutesSinceSlot > autoNoShowMinutes && !entry.checkInTime) {
        // Mark as no-show
        entry.status = 'no_show';
        entry.notes = `Auto-detected no-show (${minutesSinceSlot} mins past slot time)`;

        queue.noShowPatients++;

        // Update appointment
        await Appointment.findByIdAndUpdate(entry.appointmentId, {
          status: 'no_show',
          noShowDetectedAt: new Date(),
          noShowReason: 'auto_detected'
        });

        // Update user no-show count
        await User.findByIdAndUpdate(entry.patientId, {
          $inc: { noShowCount: 1 }
        });

        // Send notification to patient
        const patient = await User.findById(entry.patientId);
        if (patient) {
          await Notification.createQueueNotification(
            entry.patientId,
            'no_show',
            entry.appointmentId,
            { reason: 'You did not check in for your appointment' }
          );

          // Send SMS notification
          if (patient.phone && patient.notificationPreferences?.sms !== false) {
            await sendSMS(
              patient.phone,
              `Your appointment was marked as missed because you didn't check in within ${autoNoShowMinutes} minutes of your slot time. Please reschedule if needed.`
            );
          }
        }

        results.noShowsDetected++;
        results.details.push({
          queueId: queue._id,
          patientId: entry.patientId,
          appointmentId: entry.appointmentId,
          slotTime: entry.slotTime,
          minutesPast: minutesSinceSlot
        });
      }
    }

    // Recalculate wait times if any no-shows detected
    if (results.noShowsDetected > 0) {
      await recalculateMLWaitTimes(queue);
    }

    await queue.save();
    results.processed++;
  }

  return results;
}

/**
 * Proactive no-show risk alerts for upcoming appointments
 */
async function getNoShowRiskAlerts(hospitalId, date = new Date()) {
  const highRiskAppointments = await mlService.identifyHighRiskAppointments(date, 0.3);

  // Group by risk level
  const alerts = {
    high: [],
    medium: [],
    total: highRiskAppointments.length
  };

  for (const risk of highRiskAppointments) {
    const alertData = {
      appointmentId: risk.appointment?._id,
      patientName: risk.appointment?.patientId?.name,
      slotTime: risk.appointment?.slotTime,
      doctorId: risk.appointment?.doctorId,
      probability: risk.noShowProbability,
      interventions: risk.recommendedInterventions
    };

    if (risk.riskLevel === 'high') {
      alerts.high.push(alertData);
    } else {
      alerts.medium.push(alertData);
    }
  }

  return alerts;
}

/**
 * Add walk-in patient to queue
 */
async function addWalkIn(doctorId, patientId, triageData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let queue = await Queue.findOne({ doctorId, date: today });

  if (!queue) {
    queue = await initializeQueue(doctorId);
  }

  const doctor = await Doctor.findById(doctorId);

  // Create walk-in appointment
  const appointment = await Appointment.create({
    patientId,
    doctorId,
    hospitalId: doctor.hospitalId,
    date: today,
    slotTime: new Date().toTimeString().slice(0, 5),
    appointmentType: 'Walk-in',
    status: 'checked_in',
    bookingSource: 'walk_in',
    triageData,
    checkInTime: new Date()
  });

  // Add to queue
  const queueNumber = queue.addPatient(
    appointment._id,
    patientId,
    appointment.slotTime,
    triageData?.urgencyScore || 3
  );

  await recalculateMLWaitTimes(queue);
  await queue.save();

  appointment.queueNumber = queueNumber;
  await appointment.save();

  return {
    appointment,
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
    // Try ML-based prediction
    const mlResult = await mlService.getMLWaitTimes(
      waitingEntries,
      queue.avgConsultationTime || 15,
      queue.currentDelay || 0
    );

    if (mlResult?.success && mlResult.waitTimes) {
      // Apply ML predictions
      for (const prediction of mlResult.waitTimes) {
        const entry = queue.entries.find(e => e._id?.toString() === prediction.entryId);
        if (entry) {
          entry.estimatedWaitTime = prediction.estimatedWait;
          entry.noShowProbability = prediction.noShowProbability;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get completed appointments with duration
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    status: 'completed',
    actualConsultationDuration: { $exists: true, $gt: 0 }
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
}

/**
 * Get real-time queue status for display
 */
async function getQueueDisplay(doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const currentPatient = queue.currentIndex >= 0
    ? {
        queueNumber: queue.entries[queue.currentIndex].queueNumber,
        name: queue.currentPatientId?.name
      }
    : null;

  return {
    status: queue.status,
    currentPatient,
    currentDelay: queue.currentDelay,
    waitingList: waitingList.slice(0, 10), // Show max 10
    stats: queue.getSummary()
  };
}

/**
 * Check in patient
 */
async function checkInPatient(appointmentId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const queue = await Queue.findOne({
    doctorId: appointment.doctorId,
    date: today
  });

  if (!queue) {
    throw new Error('Queue not found');
  }

  const entry = queue.entries.find(
    e => e.appointmentId?.toString() === appointmentId.toString()
  );

  if (!entry) {
    throw new Error('Patient not in queue');
  }

  entry.checkInTime = new Date();
  appointment.status = 'checked_in';
  appointment.checkInTime = new Date();

  await Promise.all([queue.save(), appointment.save()]);

  return {
    message: 'Patient checked in successfully',
    queueNumber: entry.queueNumber,
    estimatedWait: entry.estimatedWaitTime
  };
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
  checkInPatient
};

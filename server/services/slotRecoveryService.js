const mongoose = require('mongoose');
const { Waitlist, Queue, Appointment, Doctor, User, Notification } = require('../models');
const { sendPushNotification, sendSMS } = require('./notificationService');
const queueManager = require('./queueManager');

/**
 * Slot Recovery Service
 * Handles no-show scenarios and maximizes doctor utilization
 */

const CONFIG = {
  RESPONSE_TIMEOUT_MINUTES: 10,
  MAX_NOTIFICATIONS_PER_SLOT: 3,
  SLOT_BUFFER_MINUTES: 5, // Minimum time before slot to notify
  OVERBOOKING_THRESHOLD: 0.3 // If no-show rate > 30%, allow overbooking
};

/**
 * Handle no-show: Auto-advance queue and try to fill slot
 */
async function handleNoShow(doctorId, appointmentId, options = {}) {
  const session = await mongoose.startSession();
  const results = {
    queueAdvanced: false,
    slotRecoveryAttempted: false,
    waitlistNotified: null,
    nextPatient: null
  };

  try {
    session.startTransaction();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get the queue and appointment
    const queue = await Queue.findOne({ doctorId, date: today }).session(session);
    const appointment = await Appointment.findById(appointmentId).session(session);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // 2. Mark appointment as no-show if not already
    if (appointment.status !== 'no_show') {
      appointment.status = 'no_show';
      appointment.noShowDetectedAt = new Date();
      await appointment.save({ session });

      // Update user no-show count
      await User.findByIdAndUpdate(
        appointment.patientId,
        { $inc: { noShowCount: 1 } },
        { session }
      );
    }

    // 3. Update queue entry
    if (queue) {
      const entry = queue.entries.find(
        e => e.appointmentId?.toString() === appointmentId.toString()
      );

      if (entry && entry.status !== 'no_show') {
        entry.status = 'no_show';
        entry.notes = options.reason || 'Marked as no-show by admin';
        queue.noShowPatients++;
      }

      // 4. AUTO-ADVANCE: If queue is active, automatically call next patient
      if (queue.status === 'active' && options.autoAdvance !== false) {
        const waitingPatients = queue.entries.filter(e => e.status === 'waiting');

        if (waitingPatients.length > 0) {
          // Get next patient
          const nextPatient = queue.getNextPatient();

          if (nextPatient) {
            const nextIndex = queue.entries.findIndex(
              e => e._id.toString() === nextPatient._id.toString()
            );

            if (nextIndex !== -1) {
              const now = new Date();
              queue.entries[nextIndex].status = 'in_consultation';
              queue.entries[nextIndex].callTime = now;
              queue.entries[nextIndex].consultationStartTime = now;
              queue.currentIndex = nextIndex;
              queue.currentPatientId = nextPatient.patientId;

              // Update appointment
              await Appointment.findByIdAndUpdate(
                nextPatient.appointmentId,
                { status: 'in_progress', consultationStartTime: now },
                { session }
              );

              results.queueAdvanced = true;
              results.nextPatient = {
                queueNumber: nextPatient.queueNumber,
                patientId: nextPatient.patientId,
                name: nextPatient.patientId?.name
              };
            }
          }
        }
      }

      await queue.save({ session });
    }

    await session.commitTransaction();

    // 5. Try to fill the slot from waitlist (async, non-blocking)
    if (options.tryFillSlot !== false) {
      setImmediate(async () => {
        try {
          const fillResult = await tryFillSlotFromWaitlist(
            doctorId,
            appointment.slotTime,
            appointment.date
          );
          results.slotRecoveryAttempted = true;
          results.waitlistNotified = fillResult;
        } catch (error) {
          console.error('Slot recovery failed:', error.message);
        }
      });
    }

    // 6. Send notifications (async)
    if (results.queueAdvanced && results.nextPatient) {
      setImmediate(async () => {
        try {
          await notifyPatientCalled(results.nextPatient, doctorId);
        } catch (error) {
          console.error('Notification failed:', error.message);
        }
      });
    }

    return results;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Try to fill an available slot from the waitlist
 */
async function tryFillSlotFromWaitlist(doctorId, slotTime, date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Get or create waitlist
  let waitlist = await Waitlist.findOne({ doctorId, date: targetDate });

  if (!waitlist || waitlist.entries.filter(e => e.status === 'waiting').length === 0) {
    return { success: false, reason: 'No patients in waitlist' };
  }

  // Expire old notifications first
  waitlist.expireOldNotifications();

  // Get next candidate
  const candidate = waitlist.getNextCandidate(slotTime);

  if (!candidate) {
    await waitlist.save();
    return { success: false, reason: 'No available candidates' };
  }

  // Notify the candidate
  const entry = waitlist.notifyPatient(candidate._id);
  await waitlist.save();

  // Get patient details
  const patient = await User.findById(candidate.patientId);

  if (!patient) {
    return { success: false, reason: 'Patient not found' };
  }

  // Create notification
  await Notification.create({
    userId: candidate.patientId,
    type: 'slot_available',
    title: 'Appointment Slot Available!',
    message: `A slot at ${slotTime} is now available. Respond within ${waitlist.responseTimeout} minutes to book it.`,
    relatedModel: 'Doctor',
    relatedId: doctorId,
    data: {
      slotTime,
      doctorId: doctorId.toString(),
      waitlistEntryId: entry._id.toString(),
      expiresAt: entry.notificationExpiry.toISOString()
    },
    expiresAt: entry.notificationExpiry
  });

  // Send push notification
  if (patient.fcmToken && patient.notificationPreferences?.push !== false) {
    await sendPushNotification(patient.fcmToken, {
      title: '🎉 Slot Available!',
      body: `An appointment slot at ${slotTime} just opened up! Tap to book now.`,
      data: {
        type: 'slot_available',
        slotTime,
        doctorId: doctorId.toString(),
        waitlistEntryId: entry._id.toString(),
        action: 'book_slot'
      }
    });
  }

  // Send SMS
  if (patient.phone && patient.notificationPreferences?.sms !== false) {
    const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
    await sendSMS(
      patient.phone,
      `Good news! A slot with Dr. ${doctor?.userId?.name || 'your doctor'} at ${slotTime} is available. Reply YES to book or open the app within ${waitlist.responseTimeout} mins.`
    );
  }

  return {
    success: true,
    patientId: candidate.patientId,
    patientName: patient.name,
    slotTime,
    expiresAt: entry.notificationExpiry
  };
}

/**
 * Handle patient response to slot offer
 */
async function handleSlotResponse(waitlistEntryId, doctorId, accepted, patientId) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const waitlist = await Waitlist.findOne({ doctorId, date: today }).session(session);

    if (!waitlist) {
      throw new Error('Waitlist not found');
    }

    const entry = waitlist.entries.id(waitlistEntryId);

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    // Verify patient
    if (entry.patientId.toString() !== patientId.toString()) {
      throw new Error('Unauthorized');
    }

    // Handle response
    try {
      waitlist.handleResponse(waitlistEntryId, accepted);
    } catch (error) {
      if (error.message === 'Response deadline passed') {
        // Try to notify next patient
        await waitlist.save({ session });
        await session.commitTransaction();

        // Async: try next candidate
        setImmediate(async () => {
          await tryFillSlotFromWaitlist(doctorId, entry.slotTime, today);
        });

        return { success: false, reason: 'Deadline passed, slot offered to next patient' };
      }
      throw error;
    }

    if (accepted) {
      // Create appointment for the patient
      const doctor = await Doctor.findById(doctorId).session(session);

      const appointment = await Appointment.create([{
        patientId: entry.patientId,
        doctorId,
        hospitalId: doctor.hospitalId,
        date: today,
        slotTime: entry.preferredSlots?.[0]?.startTime || new Date().toTimeString().slice(0, 5),
        appointmentType: 'Waitlist Booking',
        status: 'confirmed',
        bookingSource: 'waitlist',
        triageData: entry.triageData
      }], { session });

      entry.status = 'booked';

      // Add to queue
      const queue = await Queue.findOne({ doctorId, date: today }).session(session);

      if (queue) {
        queue.addPatient(
          appointment[0]._id,
          entry.patientId,
          appointment[0].slotTime,
          entry.urgencyScore
        );
        await queue.save({ session });
      }

      await waitlist.save({ session });
      await session.commitTransaction();

      // Notify patient of successful booking
      const patient = await User.findById(entry.patientId);
      if (patient?.fcmToken) {
        await sendPushNotification(patient.fcmToken, {
          title: 'Appointment Confirmed!',
          body: `Your appointment has been booked. Please arrive on time.`,
          data: {
            type: 'appointment_confirmed',
            appointmentId: appointment[0]._id.toString()
          }
        });
      }

      return {
        success: true,
        appointment: appointment[0],
        message: 'Slot booked successfully'
      };
    } else {
      // Patient declined - try next candidate
      await waitlist.save({ session });
      await session.commitTransaction();

      // Async: notify next patient
      setImmediate(async () => {
        await tryFillSlotFromWaitlist(doctorId, entry.slotTime, today);
      });

      return {
        success: true,
        message: 'Slot declined, offered to next patient'
      };
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Add patient to waitlist
 */
async function addToWaitlist(doctorId, patientId, options = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Get or create waitlist
  let waitlist = await Waitlist.findOne({ doctorId, date: today });

  if (!waitlist) {
    waitlist = await Waitlist.create({
      doctorId,
      hospitalId: doctor.hospitalId,
      date: today,
      entries: []
    });
  }

  const entry = waitlist.addPatient(patientId, options);
  await waitlist.save();

  // Get position in waitlist
  const position = waitlist.entries
    .filter(e => ['waiting', 'notified'].includes(e.status))
    .findIndex(e => e._id.toString() === entry._id.toString()) + 1;

  return {
    waitlistId: waitlist._id,
    entryId: entry._id,
    position,
    totalWaiting: waitlist.entries.filter(e => e.status === 'waiting').length
  };
}

/**
 * Get waitlist status for a patient
 */
async function getPatientWaitlistStatus(patientId, doctorId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const query = { date: today };
  if (doctorId) {
    query.doctorId = doctorId;
  }

  const waitlists = await Waitlist.find(query)
    .populate('doctorId', 'userId specialty')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    });

  const patientEntries = [];

  for (const waitlist of waitlists) {
    const entry = waitlist.entries.find(
      e => e.patientId.toString() === patientId.toString() &&
           ['waiting', 'notified'].includes(e.status)
    );

    if (entry) {
      const position = waitlist.entries
        .filter(e => ['waiting', 'notified'].includes(e.status) && e.joinedAt <= entry.joinedAt)
        .length;

      patientEntries.push({
        waitlistId: waitlist._id,
        entryId: entry._id,
        doctorId: waitlist.doctorId._id,
        doctorName: waitlist.doctorId.userId?.name,
        specialty: waitlist.doctorId.specialty,
        status: entry.status,
        position,
        joinedAt: entry.joinedAt,
        notifiedAt: entry.notifiedAt,
        expiresAt: entry.notificationExpiry
      });
    }
  }

  return patientEntries;
}

/**
 * Calculate optimal overbooking level based on no-show history
 */
async function calculateOverbookingLevel(doctorId, date = new Date()) {
  const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get historical appointments
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: thirtyDaysAgo, $lte: date },
    status: { $in: ['completed', 'no_show', 'cancelled'] }
  });

  if (appointments.length < 10) {
    return { overbookingAllowed: false, reason: 'Insufficient data' };
  }

  const totalAppointments = appointments.length;
  const noShows = appointments.filter(a => a.status === 'no_show').length;
  const noShowRate = noShows / totalAppointments;

  // Get doctor's average consultation time
  const doctor = await Doctor.findById(doctorId);
  const avgConsultationTime = doctor?.avgConsultationTime || 15;

  // Calculate suggested overbooking
  let overbookingSlots = 0;
  let overbookingAllowed = false;

  if (noShowRate >= CONFIG.OVERBOOKING_THRESHOLD) {
    overbookingAllowed = true;
    // Calculate how many extra slots can be added per hour
    const slotsPerHour = Math.floor(60 / avgConsultationTime);
    overbookingSlots = Math.ceil(slotsPerHour * noShowRate);
  }

  return {
    overbookingAllowed,
    suggestedOverbookingSlots: overbookingSlots,
    noShowRate: Math.round(noShowRate * 100),
    totalAppointments,
    noShows,
    avgConsultationTime,
    recommendation: overbookingAllowed
      ? `Based on ${noShowRate * 100}% no-show rate, consider adding ${overbookingSlots} extra slots per hour.`
      : 'No-show rate is manageable. Overbooking not recommended.'
  };
}

/**
 * Process expired waitlist notifications and notify next candidates
 */
async function processExpiredNotifications(hospitalId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const query = { date: today };
  if (hospitalId) {
    query.hospitalId = hospitalId;
  }

  const waitlists = await Waitlist.find(query);
  const results = {
    processed: 0,
    expired: 0,
    renotified: 0
  };

  for (const waitlist of waitlists) {
    const expired = waitlist.expireOldNotifications();
    results.expired += expired.length;

    if (expired.length > 0 && waitlist.autoNotifyNext) {
      // Try to notify next candidate for each expired notification
      for (const entry of expired) {
        try {
          await tryFillSlotFromWaitlist(waitlist.doctorId, entry.slotTime, today);
          results.renotified++;
        } catch (error) {
          console.error('Re-notification failed:', error.message);
        }
      }
    }

    await waitlist.save();
    results.processed++;
  }

  return results;
}

/**
 * Send notification when patient is called
 */
async function notifyPatientCalled(patient, doctorId) {
  const user = await User.findById(patient.patientId);
  const doctor = await Doctor.findById(doctorId).populate('userId', 'name');

  if (!user) return;

  await Notification.create({
    userId: patient.patientId,
    type: 'your_turn',
    title: "It's Your Turn!",
    message: `Dr. ${doctor?.userId?.name || 'The doctor'} is ready to see you. Please proceed to the consultation room.`,
    relatedModel: 'Doctor',
    relatedId: doctorId
  });

  if (user.fcmToken && user.notificationPreferences?.push !== false) {
    await sendPushNotification(user.fcmToken, {
      title: "🏥 It's Your Turn!",
      body: 'Please proceed to the consultation room immediately.',
      data: {
        type: 'your_turn',
        doctorId: doctorId.toString(),
        queueNumber: String(patient.queueNumber)
      }
    });
  }

  if (user.phone && user.notificationPreferences?.sms !== false) {
    await sendSMS(
      user.phone,
      `It's your turn! Dr. ${doctor?.userId?.name || 'The doctor'} is ready to see you. Please proceed to the consultation room.`
    );
  }
}

module.exports = {
  handleNoShow,
  tryFillSlotFromWaitlist,
  handleSlotResponse,
  addToWaitlist,
  getPatientWaitlistStatus,
  calculateOverbookingLevel,
  processExpiredNotifications
};

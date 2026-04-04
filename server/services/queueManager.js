const { Queue, Appointment, Doctor, Notification, User } = require('../models');

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
    .populate('entries.patientId', 'name phone')
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

  // Recalculate wait times for remaining patients
  queue.recalculateWaitTimes();
  await queue.save();

  // Update average consultation time
  await updateAverageConsultationTime(doctorId);

  // Send notification to patient
  await Notification.createQueueNotification(
    nextPatient.patientId,
    'your_turn',
    nextPatient.appointmentId
  );

  // Notify next 2 patients that they're coming up
  const upcomingPatients = queue.entries
    .filter(e => e.status === 'waiting')
    .sort((a, b) => a.position - b.position)
    .slice(0, 2);

  for (const patient of upcomingPatients) {
    await Notification.createQueueNotification(
      patient.patientId,
      'queue_update',
      patient.appointmentId,
      {
        position: queue.entries.filter(
          e => e.status === 'waiting' && e.position < patient.position
        ).length + 1,
        waitTime: patient.estimatedWaitTime
      }
    );
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

  queue.recalculateWaitTimes();
  await queue.save();

  return {
    message: markAsNoShow ? 'Patient marked as no-show' : 'Patient skipped',
    summary: queue.getSummary()
  };
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

  queue.recalculateWaitTimes();
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
      queue.recalculateWaitTimes();
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
      urgency: e.urgencyScore
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

module.exports = {
  initializeQueue,
  callNextPatient,
  completeCurrentPatient,
  skipPatient,
  addWalkIn,
  updateAverageConsultationTime,
  getQueueDisplay
};

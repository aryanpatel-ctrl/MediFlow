const express = require('express');
const router = express.Router();
const { Queue, Appointment, Notification, Doctor } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');
const queueManager = require('../services/queueManager');

// @route   GET /api/queue/hospital/:hospitalId/summary
// @desc    Get hospital-wide queue summary for dashboard
// @access  Private/Hospital Admin
router.get('/hospital/:hospitalId/summary', protect, authorize('hospital_admin', 'doctor'), asyncHandler(async (req, res) => {
  const summary = await Queue.getHospitalSummary(req.params.hospitalId);

  res.status(200).json({
    success: true,
    summary
  });
}));

// @route   GET /api/queue/hospital/:hospitalId/all-queues
// @desc    Get all doctor queues for a hospital
// @access  Private/Hospital Admin
router.get('/hospital/:hospitalId/all-queues', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queues = await Queue.find({
    hospitalId: req.params.hospitalId,
    date: today
  })
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate('entries.patientId', 'name phone email')
    .populate('entries.appointmentId', 'scheduledTime type reason');

  const formattedQueues = queues.map(queue => ({
    _id: queue._id,
    doctorId: queue.doctorId._id,
    doctorName: queue.doctorId.userId?.name || 'Unknown',
    specialty: queue.doctorId.specialty,
    status: queue.status,
    currentDelay: queue.currentDelay,
    entries: queue.entries.map(entry => ({
      _id: entry._id,
      queueNumber: entry.queueNumber,
      patientId: entry.patientId?._id || entry.patientId,
      patientName: entry.patientId?.name || 'Unknown',
      patientPhone: entry.patientId?.phone || '',
      status: entry.status,
      slotTime: entry.slotTime,
      checkInTime: entry.checkInTime,
      urgencyScore: entry.urgencyScore,
      appointmentType: entry.appointmentId?.type,
      reason: entry.appointmentId?.reason
    })),
    summary: queue.getSummary()
  }));

  res.status(200).json({
    success: true,
    queues: formattedQueues
  });
}));

// @route   POST /api/queue/hospital/:hospitalId/initialize
// @desc    Initialize queues for all doctors for today
// @access  Private/Hospital Admin
router.post('/hospital/:hospitalId/initialize', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active doctors in the hospital
  const doctors = await Doctor.find({
    hospitalId: req.params.hospitalId,
    isActive: true
  });

  const initializedQueues = [];

  for (const doctor of doctors) {
    const existingQueue = await Queue.findOne({
      doctorId: doctor._id,
      date: today
    });

    if (!existingQueue) {
      const queue = await Queue.create({
        doctorId: doctor._id,
        hospitalId: req.params.hospitalId,
        date: today,
        status: 'not_started',
        entries: []
      });
      initializedQueues.push(queue);
    }
  }

  res.status(200).json({
    success: true,
    message: `Initialized ${initializedQueues.length} new queues`,
    totalDoctors: doctors.length
  });
}));

// @route   GET /api/queue/:doctorId/today
// @desc    Get today's queue for a doctor
// @access  Private
router.get('/:doctorId/today', protect, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  })
    .populate('entries.patientId', 'name phone')
    .populate('entries.appointmentId', 'slotTime triageData status');

  if (!queue) {
    throw new AppError('No queue found for today', 404);
  }

  res.status(200).json({
    success: true,
    queue: {
      ...queue.toObject(),
      summary: queue.getSummary()
    }
  });
}));

// @route   GET /api/queue/:doctorId/patient-status
// @desc    Get patient's position in queue
// @access  Private
router.get('/:doctorId/patient-status', protect, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found', 404);
  }

  const entry = queue.entries.find(
    e => e.patientId.toString() === req.user.id
  );

  if (!entry) {
    throw new AppError('You are not in this queue', 404);
  }

  // Calculate position (only count waiting patients ahead)
  const waitingAhead = queue.entries.filter(
    e => e.status === 'waiting' && e.position < entry.position
  ).length;

  res.status(200).json({
    success: true,
    queueNumber: entry.queueNumber,
    position: waitingAhead + 1,
    status: entry.status,
    estimatedWaitTime: queue.getEstimatedWait(entry.position),
    currentDelay: queue.currentDelay
  });
}));

// @route   PUT /api/queue/:doctorId/call-next
// @desc    Call next patient
// @access  Private/Doctor
router.put('/:doctorId/call-next', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const result = await queueManager.callNextPatient(req.params.doctorId);

  // Emit socket event
  const io = req.app.get('io');
  if (io && result.patient) {
    // Notify the patient
    io.to(`user:${result.patient.patientId}`).emit('queue:your-turn', {
      doctorId: req.params.doctorId,
      queueNumber: result.patient.queueNumber
    });

    // Update queue display
    io.to(`queue:${req.params.doctorId}`).emit('queue:update', {
      currentPatient: result.patient.queueNumber,
      summary: result.summary
    });
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   PUT /api/queue/:doctorId/complete-current
// @desc    Mark current patient as complete
// @access  Private/Doctor
router.put('/:doctorId/complete-current', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const result = await queueManager.completeCurrentPatient(req.params.doctorId, notes);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:update', {
      summary: result.summary
    });
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   PUT /api/queue/:doctorId/skip-patient
// @desc    Skip current patient (no show or stepped out)
// @access  Private/Doctor
router.put('/:doctorId/skip-patient', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { reason, markAsNoShow } = req.body;

  const result = await queueManager.skipPatient(req.params.doctorId, reason, markAsNoShow);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:update', {
      summary: result.summary
    });
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   PUT /api/queue/:doctorId/add-delay
// @desc    Add delay to queue
// @access  Private/Doctor
router.put('/:doctorId/add-delay', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { delayMinutes, reason } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found', 404);
  }

  queue.currentDelay += delayMinutes;
  queue.delayReason = reason;
  queue.delayAnnounced = false;
  queue.recalculateWaitTimes();
  await queue.save();

  // Notify all waiting patients
  const waitingPatients = queue.entries.filter(e => e.status === 'waiting');

  for (const entry of waitingPatients) {
    await Notification.createQueueNotification(
      entry.patientId,
      'delay_notification',
      entry.appointmentId,
      { delay: queue.currentDelay }
    );
  }

  queue.delayAnnounced = true;
  await queue.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:delay', {
      delay: queue.currentDelay,
      reason
    });
  }

  res.status(200).json({
    success: true,
    message: `Delay of ${delayMinutes} minutes added`,
    currentDelay: queue.currentDelay
  });
}));

// @route   PUT /api/queue/:doctorId/pause
// @desc    Pause queue
// @access  Private/Doctor
router.put('/:doctorId/pause', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found', 404);
  }

  queue.status = 'paused';
  queue.pauseTime = new Date();
  await queue.save();

  // Update doctor status
  const { Doctor } = require('../models');
  await Doctor.findByIdAndUpdate(req.params.doctorId, {
    currentQueueStatus: 'paused'
  });

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:paused');
  }

  res.status(200).json({
    success: true,
    message: 'Queue paused'
  });
}));

// @route   PUT /api/queue/:doctorId/resume
// @desc    Resume queue
// @access  Private/Doctor
router.put('/:doctorId/resume', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found', 404);
  }

  // Calculate pause duration
  if (queue.pauseTime) {
    const pauseDuration = Math.round((new Date() - queue.pauseTime) / (1000 * 60));
    queue.totalPauseDuration += pauseDuration;
    queue.currentDelay += pauseDuration;
  }

  queue.status = 'active';
  queue.pauseTime = null;
  queue.recalculateWaitTimes();
  await queue.save();

  // Update doctor status
  const { Doctor } = require('../models');
  await Doctor.findByIdAndUpdate(req.params.doctorId, {
    currentQueueStatus: 'active'
  });

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:resumed', {
      summary: queue.getSummary()
    });
  }

  res.status(200).json({
    success: true,
    message: 'Queue resumed',
    summary: queue.getSummary()
  });
}));

// @route   PUT /api/queue/:doctorId/close
// @desc    Close queue for the day
// @access  Private/Doctor
router.put('/:doctorId/close', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found', 404);
  }

  queue.status = 'closed';
  queue.endTime = new Date();

  // Calculate average wait time
  const completedEntries = queue.entries.filter(e => e.actualWaitTime);
  if (completedEntries.length > 0) {
    const totalWait = completedEntries.reduce((sum, e) => sum + e.actualWaitTime, 0);
    queue.avgWaitTime = Math.round(totalWait / completedEntries.length);
  }

  await queue.save();

  // Update doctor status
  const { Doctor } = require('../models');
  await Doctor.findByIdAndUpdate(req.params.doctorId, {
    currentQueueStatus: 'closed',
    currentPatientIndex: 0
  });

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:closed');
  }

  res.status(200).json({
    success: true,
    message: 'Queue closed',
    summary: queue.getSummary()
  });
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const { Queue, Appointment, Notification, Doctor, User } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');
const queueManager = require('../services/queueManager');
const slotRecoveryService = require('../services/slotRecoveryService');
const { QueueError } = queueManager;
const { sendPushNotification } = require('../services/notificationService');

// Custom error handler for queue operations
const handleQueueError = (error, res) => {
  if (error.name === 'QueueError') {
    return res.status(error.statusCode || 400).json({
      success: false,
      code: error.code,
      message: error.message
    });
  }
  throw error; // Re-throw for global error handler
};

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

// @route   PUT /api/queue/:doctorId/start
// @desc    Start queue for the day
// @access  Private/Doctor
router.put('/:doctorId/start', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found for today', 404);
  }

  queue.status = 'active';
  queue.startTime = new Date();
  await queue.save();

  // Update doctor status
  await Doctor.findByIdAndUpdate(req.params.doctorId, {
    currentQueueStatus: 'active'
  });

  // Get hospital ID for broadcasting
  const doctor = await Doctor.findById(req.params.doctorId);
  const hospitalId = doctor?.hospitalId;

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:started', {
      status: 'active'
    });

    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:started', {
        doctorId: req.params.doctorId,
        status: 'active'
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Queue started',
    queue: {
      ...queue.toObject(),
      summary: queue.getSummary()
    }
  });
}));

// @route   PUT /api/queue/:doctorId/call-next
// @desc    Call next patient
// @access  Private/Doctor
router.put('/:doctorId/call-next', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const result = await queueManager.callNextPatient(req.params.doctorId);

  // Get hospital ID for broadcasting
  const doctor = await Doctor.findById(req.params.doctorId);
  const hospitalId = doctor?.hospitalId;

  // Emit socket event
  const io = req.app.get('io');
  if (io && result.patient) {
    // Notify the patient
    io.to(`user:${result.patient.patientId}`).emit('queue:your-turn', {
      doctorId: req.params.doctorId,
      queueNumber: result.patient.queueNumber
    });

    // Update queue display for doctor's queue room
    io.to(`queue:${req.params.doctorId}`).emit('queue:update', {
      currentPatient: result.patient.queueNumber,
      summary: result.summary
    });

    // Broadcast to hospital admin dashboard
    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:patient-called', {
        doctorId: req.params.doctorId,
        queueNumber: result.patient.queueNumber,
        patientName: result.patient.name,
        summary: result.summary
      });
    }
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

  // Get hospital ID and doctor name for broadcasting
  const doctor = await Doctor.findById(req.params.doctorId).populate('userId', 'name');
  const hospitalId = doctor?.hospitalId;
  const doctorName = doctor?.userId?.name || 'Doctor';

  // Create notification for patient
  if (result.completedPatient?.patientId) {
    await Notification.create({
      userId: result.completedPatient.patientId,
      type: 'consultation_completed',
      title: 'Consultation Completed',
      message: `Your consultation with Dr. ${doctorName} has been completed.`,
      relatedId: req.params.doctorId,
      relatedModel: 'Doctor'
    });
  }

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:update', {
      summary: result.summary
    });

    // Broadcast to hospital admin dashboard
    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:update', {
        doctorId: req.params.doctorId,
        doctorName,
        action: 'completed',
        patientName: result.completedPatient?.name,
        summary: result.summary
      });
    }
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

  // Get hospital ID and doctor name for broadcasting
  const doctor = await Doctor.findById(req.params.doctorId).populate('userId', 'name');
  const hospitalId = doctor?.hospitalId;
  const doctorName = doctor?.userId?.name || 'Doctor';

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:update', {
      summary: result.summary
    });

    // Broadcast to hospital admin dashboard
    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:update', {
        doctorId: req.params.doctorId,
        doctorName,
        action: markAsNoShow ? 'no_show' : 'skipped',
        patientName: result.skippedPatient?.name,
        summary: result.summary
      });
    }
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   POST /api/queue/:doctorId/handle-no-show/:appointmentId
// @desc    Handle no-show with auto-advance and slot recovery
// @access  Private/Doctor/Hospital Admin
router.post('/:doctorId/handle-no-show/:appointmentId', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { reason, autoAdvance = true, tryFillSlot = true } = req.body;

  const result = await slotRecoveryService.handleNoShow(
    req.params.doctorId,
    req.params.appointmentId,
    { reason, autoAdvance, tryFillSlot }
  );

  // Get hospital info for broadcasting
  const doctor = await Doctor.findById(req.params.doctorId).populate('userId', 'name');
  const hospitalId = doctor?.hospitalId;
  const doctorName = doctor?.userId?.name || 'Doctor';

  // Emit socket events
  const io = req.app.get('io');
  if (io) {
    // Update queue display
    io.to(`queue:${req.params.doctorId}`).emit('queue:no-show-handled', {
      queueAdvanced: result.queueAdvanced,
      nextPatient: result.nextPatient,
      slotRecoveryAttempted: result.slotRecoveryAttempted
    });

    // If next patient was called, notify them
    if (result.queueAdvanced && result.nextPatient) {
      io.to(`user:${result.nextPatient.patientId}`).emit('queue:your-turn', {
        doctorId: req.params.doctorId,
        queueNumber: result.nextPatient.queueNumber
      });
    }

    // Broadcast to hospital admin
    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:no-show-handled', {
        doctorId: req.params.doctorId,
        doctorName,
        queueAdvanced: result.queueAdvanced,
        nextPatientName: result.nextPatient?.name,
        slotRecoveryAttempted: result.slotRecoveryAttempted
      });
    }
  }

  res.status(200).json({
    success: true,
    message: result.queueAdvanced
      ? `No-show recorded. ${result.nextPatient?.name || 'Next patient'} has been called.`
      : 'No-show recorded. No more patients in queue.',
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

    // Send FCM push notification for delay
    const patient = await User.findById(entry.patientId);
    if (patient?.fcmToken && patient.notificationPreferences?.push !== false) {
      await sendPushNotification(patient.fcmToken, {
        title: 'Queue Delay Notice',
        body: `There's a ${queue.currentDelay} minute delay. ${reason ? `Reason: ${reason}` : 'We apologize for the inconvenience.'}`,
        data: {
          type: 'delay_notification',
          appointmentId: entry.appointmentId.toString(),
          delay: String(queue.currentDelay)
        }
      });
    }
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
  await Doctor.findByIdAndUpdate(req.params.doctorId, {
    currentQueueStatus: 'paused'
  });

  // Get hospital ID
  const doctor = await Doctor.findById(req.params.doctorId);
  const hospitalId = doctor?.hospitalId;

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:paused');

    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:paused', {
        doctorId: req.params.doctorId
      });
    }
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
  await Doctor.findByIdAndUpdate(req.params.doctorId, {
    currentQueueStatus: 'active'
  });

  // Get hospital ID
  const doctor = await Doctor.findById(req.params.doctorId);
  const hospitalId = doctor?.hospitalId;

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('queue:resumed', {
      summary: queue.getSummary()
    });

    if (hospitalId) {
      io.to(`hospital:${hospitalId}`).emit('queue:resumed', {
        doctorId: req.params.doctorId,
        summary: queue.getSummary()
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Queue resumed',
    summary: queue.getSummary()
  });
}));

// @route   POST /api/queue/hospital/:hospitalId/auto-no-show
// @desc    Run auto no-show detection for all queues in hospital
// @access  Private/Hospital Admin
router.post('/hospital/:hospitalId/auto-no-show', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const results = await queueManager.autoDetectNoShows(req.params.hospitalId);

  // Emit socket updates for each detected no-show
  if (results.noShowsDetected > 0) {
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital:${req.params.hospitalId}`).emit('queue:no-shows-detected', {
        count: results.noShowsDetected,
        details: results.details
      });
    }
  }

  res.status(200).json({
    success: true,
    ...results
  });
}));

// @route   GET /api/queue/hospital/:hospitalId/no-show-alerts
// @desc    Get all no-show risk alerts for hospital
// @access  Private/Hospital Admin
router.get('/hospital/:hospitalId/no-show-alerts', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  const alerts = await queueManager.getNoShowRiskAlerts(req.params.hospitalId, targetDate);

  res.status(200).json({
    success: true,
    date: targetDate.toISOString().split('T')[0],
    alerts
  });
}));

// @route   GET /api/queue/hospital/:hospitalId/analytics
// @desc    Get hospital-wide queue analytics
// @access  Private/Hospital Admin
router.get('/hospital/:hospitalId/analytics', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const doctorAnalytics = require('../services/doctorAnalyticsService');
  const { specialty } = req.query;

  const comparison = await doctorAnalytics.getDoctorComparison(
    req.params.hospitalId,
    specialty || null
  );

  // Get additional hospital-wide stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hospitalSummary = await Queue.getHospitalSummary(req.params.hospitalId);

  res.status(200).json({
    success: true,
    hospitalSummary,
    doctorComparison: comparison
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

// @route   GET /api/queue/:doctorId/health
// @desc    Get queue health status (for monitoring)
// @access  Private/Doctor/Hospital Admin
router.get('/:doctorId/health', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const health = await queueManager.getQueueHealth(req.params.doctorId);

  res.status(200).json({
    success: true,
    ...health
  });
}));

// @route   DELETE /api/queue/appointment/:appointmentId
// @desc    Cancel appointment and remove from queue
// @access  Private
router.delete('/appointment/:appointmentId', protect, asyncHandler(async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await queueManager.cancelAppointmentInQueue(
      req.params.appointmentId,
      reason || 'Cancelled by user'
    );

    // Emit socket event for queue update
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (appointment) {
      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${appointment.doctorId}`).emit('queue:update', {
          action: 'cancelled',
          appointmentId: req.params.appointmentId,
          summary: result.summary
        });
      }
    }

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    handleQueueError(error, res);
  }
}));

// @route   POST /api/queue/:doctorId/initialize
// @desc    Initialize queue for a doctor
// @access  Private/Doctor/Hospital Admin
router.post('/:doctorId/initialize', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  try {
    const queue = await queueManager.initializeQueue(req.params.doctorId);

    res.status(200).json({
      success: true,
      message: 'Queue initialized',
      queue: {
        _id: queue._id,
        status: queue.status,
        totalPatients: queue.totalPatients,
        summary: queue.getSummary()
      }
    });
  } catch (error) {
    handleQueueError(error, res);
  }
}));

// @route   GET /api/queue/:doctorId/display
// @desc    Get queue display data for screens
// @access  Public (for TV displays in waiting rooms)
router.get('/:doctorId/display', asyncHandler(async (req, res) => {
  const display = await queueManager.getQueueDisplay(req.params.doctorId);

  res.status(200).json({
    success: true,
    ...display
  });
}));

// @route   POST /api/queue/:doctorId/check-in/:appointmentId
// @desc    Check in patient to queue
// @access  Private
router.post('/:doctorId/check-in/:appointmentId', protect, asyncHandler(async (req, res) => {
  try {
    const result = await queueManager.checkInPatient(req.params.appointmentId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`queue:${req.params.doctorId}`).emit('queue:check-in', {
        queueNumber: result.queueNumber,
        position: result.position
      });

      // Notify the patient
      io.to(`user:${req.user.id}`).emit('queue:checked-in', {
        queueNumber: result.queueNumber,
        position: result.position,
        estimatedWait: result.estimatedWait
      });
    }

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    handleQueueError(error, res);
  }
}));

// @route   POST /api/queue/:doctorId/walk-in
// @desc    Add walk-in patient to queue
// @access  Private/Hospital Admin/Doctor
router.post('/:doctorId/walk-in', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  try {
    const { patientId, triageData } = req.body;

    if (!patientId) {
      throw new AppError('Patient ID is required', 400);
    }

    const result = await queueManager.addWalkIn(
      req.params.doctorId,
      patientId,
      triageData || {}
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`queue:${req.params.doctorId}`).emit('queue:walk-in', {
        queueNumber: result.queueNumber,
        summary: result.summary
      });

      // Notify the patient
      io.to(`user:${patientId}`).emit('queue:added', {
        queueNumber: result.queueNumber,
        estimatedWait: result.estimatedWait,
        appointmentId: result.appointment._id
      });
    }

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    handleQueueError(error, res);
  }
}));

// @route   GET /api/queue/health
// @desc    Overall queue system health check
// @access  Public (for monitoring)
router.get('/health', asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Check if we can query the database
    const activeQueues = await Queue.countDocuments({
      date: today,
      status: 'active'
    });

    const totalQueues = await Queue.countDocuments({ date: today });

    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        activeQueues,
        totalQueues,
        date: today.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
}));

module.exports = router;

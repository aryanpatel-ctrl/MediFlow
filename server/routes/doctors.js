const express = require('express');
const router = express.Router();
const { Doctor, User, Appointment, Queue, Notification } = require('../models');
const { protect, authorize, asyncHandler, AppError, generateToken } = require('../middleware');
const slotGenerator = require('../services/slotGenerator');

// @route   GET /api/doctors
// @desc    Get all doctors with optional filters
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const { specialty, hospitalId, available } = req.query;

  const query = { isActive: true };

  if (specialty) {
    query.specialty = specialty;
  }

  if (hospitalId) {
    query.hospitalId = hospitalId;
  }

  let doctors = await Doctor.find(query)
    .populate('userId', 'name email phone')
    .populate('hospitalId', 'name address')
    .sort({ 'rating.average': -1, experience: -1 });

  // Filter by availability if requested
  if (available === 'true') {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    doctors = doctors.filter(doc => {
      const dayAvailability = doc.availability?.find(a => a.day.toLowerCase() === dayOfWeek);
      return dayAvailability && dayAvailability.isAvailable;
    });
  }

  res.status(200).json({
    success: true,
    count: doctors.length,
    doctors
  });
}));

// @route   POST /api/doctors/onboard
// @desc    Onboard new doctor (Hospital Admin only)
// @access  Private/HospitalAdmin
router.post('/onboard', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    specialty,
    qualification,
    registrationNumber,
    experience,
    consultationFee,
    slotDuration,
    availability,
    languages
  } = req.body;

  // Create doctor user
  const doctorUser = await User.create({
    name,
    email,
    phone,
    password,
    role: 'doctor',
    hospitalId: req.user.hospitalId,
    isVerified: true
  });

  // Create doctor profile
  const doctor = await Doctor.create({
    userId: doctorUser._id,
    hospitalId: req.user.hospitalId,
    specialty,
    qualification,
    registrationNumber,
    experience,
    consultationFee,
    slotDuration: slotDuration || 15,
    availability,
    languages
  });

  // Update hospital doctor count
  const { Hospital } = require('../models');
  await Hospital.findByIdAndUpdate(req.user.hospitalId, {
    $inc: { totalDoctors: 1 }
  });

  res.status(201).json({
    success: true,
    message: 'Doctor onboarded successfully',
    doctor: {
      ...doctor.toObject(),
      user: {
        id: doctorUser._id,
        name: doctorUser.name,
        email: doctorUser.email
      }
    }
  });
}));

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('hospitalId', 'name address');

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  res.status(200).json({
    success: true,
    doctor
  });
}));

// @route   PUT /api/doctors/:id
// @desc    Update doctor profile
// @access  Private/Doctor
router.put('/:id', protect, asyncHandler(async (req, res) => {
  let doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Check authorization
  if (req.user.role === 'doctor' && doctor.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  const allowedFields = [
    'bio', 'profilePhoto', 'consultationFee', 'slotDuration',
    'maxPatientsPerDay', 'availability', 'blockedDates',
    'languages', 'isAcceptingPatients'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    doctor
  });
}));

// @route   GET /api/doctors/:id/slots
// @desc    Get available slots for a doctor on a date
// @access  Public
router.get('/:id/slots', asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    throw new AppError('Date is required', 400);
  }

  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const slots = await slotGenerator.getAvailableSlots(doctor, new Date(date));

  res.status(200).json({
    success: true,
    date,
    doctor: {
      id: doctor._id,
      slotDuration: doctor.slotDuration
    },
    slots
  });
}));

// @route   POST /api/doctors/:id/block-date
// @desc    Block a date (leave/holiday)
// @access  Private/Doctor
router.post('/:id/block-date', protect, asyncHandler(async (req, res) => {
  const { date, reason } = req.body;

  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  if (doctor.userId.toString() !== req.user.id && req.user.role !== 'hospital_admin') {
    throw new AppError('Not authorized', 403);
  }

  doctor.blockedDates.push({
    date: new Date(date),
    reason
  });

  await doctor.save();

  res.status(200).json({
    success: true,
    message: 'Date blocked successfully',
    blockedDates: doctor.blockedDates
  });
}));

// @route   GET /api/doctors/:id/queue
// @desc    Get doctor's current queue
// @access  Private/Doctor
router.get('/:id/queue', protect, asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let queue = await Queue.findOne({
    doctorId: doctor._id,
    date: today
  }).populate('entries.patientId', 'name phone')
    .populate('entries.appointmentId', 'slotTime triageData');

  if (!queue) {
    // Create queue for today
    queue = await Queue.create({
      doctorId: doctor._id,
      hospitalId: doctor.hospitalId,
      date: today,
      status: 'not_started'
    });
  }

  res.status(200).json({
    success: true,
    queue: {
      ...queue.toObject(),
      summary: queue.getSummary()
    }
  });
}));

// @route   PUT /api/doctors/:id/queue/start
// @desc    Start the queue
// @access  Private/Doctor
router.put('/:id/queue/start', protect, asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('userId', 'name');

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const doctorName = doctor.userId?.name || 'Doctor';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: doctor._id,
    date: today
  });

  if (!queue) {
    throw new AppError('No queue found for today', 404);
  }

  queue.status = 'active';
  queue.startTime = new Date();
  await queue.save();

  // Update doctor status
  doctor.currentQueueStatus = 'active';
  await doctor.save();

  // Create notification for hospital admins
  if (doctor.hospitalId) {
    const admins = await User.find({ hospitalId: doctor.hospitalId, role: 'hospital_admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'queue_started',
        title: 'Queue Started',
        message: `Dr. ${doctorName} has started their queue for today.`,
        relatedId: queue._id,
        relatedModel: 'Queue'
      });
    }
  }

  // Emit socket event to hospital room for real-time updates
  const io = req.app.get('io');
  if (io) {
    console.log('Emitting queue:started to queue:', doctor._id);
    io.to(`queue:${doctor._id}`).emit('queue:started', {
      status: 'active',
      doctorName
    });

    if (doctor.hospitalId) {
      console.log('Emitting queue:started to hospital:', doctor.hospitalId.toString());
      io.to(`hospital:${doctor.hospitalId}`).emit('queue:started', {
        doctorId: doctor._id,
        doctorName,
        status: 'active'
      });
    }
  } else {
    console.log('IO not found on app');
  }

  res.status(200).json({
    success: true,
    message: 'Queue started',
    queue: queue.getSummary()
  });
}));

// @route   PUT /api/doctors/:id/queue/next
// @desc    Call next patient
// @access  Private/Doctor
router.put('/:id/queue/next', protect, asyncHandler(async (req, res) => {
  const queueManager = require('../services/queueManager');
  const result = await queueManager.callNextPatient(req.params.id);

  // Get doctor for hospital ID and name
  const doctor = await Doctor.findById(req.params.id).populate('userId', 'name');
  const doctorName = doctor?.userId?.name || 'Doctor';

  // Create notification for the patient
  if (result.patient?.patientId) {
    await Notification.create({
      userId: result.patient.patientId,
      type: 'your_turn',
      title: "It's Your Turn!",
      message: `Please proceed to Dr. ${doctorName}'s consultation room. Token #${result.patient.queueNumber}`,
      relatedId: req.params.id,
      relatedModel: 'Doctor'
    });
  }

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  if (io && result.patient) {
    console.log('Emitting queue:patient-called, patient:', result.patient.queueNumber);

    // Notify the patient
    io.to(`user:${result.patient.patientId}`).emit('queue:your-turn', {
      doctorId: req.params.id,
      doctorName,
      queueNumber: result.patient.queueNumber
    });

    // Update queue display for doctor's queue room
    io.to(`queue:${req.params.id}`).emit('queue:update', {
      currentPatient: result.patient.queueNumber,
      summary: result.summary
    });

    // Broadcast to hospital admin dashboard
    if (doctor?.hospitalId) {
      console.log('Emitting to hospital room:', doctor.hospitalId.toString());
      io.to(`hospital:${doctor.hospitalId}`).emit('queue:patient-called', {
        doctorId: req.params.id,
        doctorName,
        queueNumber: result.patient.queueNumber,
        patientName: result.patient.name,
        summary: result.summary
      });
    }
  } else {
    console.log('IO not found or no patient in result');
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   GET /api/doctors/:id/analytics
// @desc    Get doctor analytics and performance metrics
// @access  Private/Doctor or HospitalAdmin
router.get('/:id/analytics', protect, asyncHandler(async (req, res) => {
  const doctorAnalytics = require('../services/doctorAnalyticsService');
  const { days = 30 } = req.query;

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Check authorization
  if (req.user.role === 'doctor' && doctor.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  const analytics = await doctorAnalytics.getDoctorAnalytics(req.params.id, parseInt(days));

  res.status(200).json({
    success: true,
    analytics
  });
}));

// @route   GET /api/doctors/:id/analytics/trends
// @desc    Get efficiency trends over time
// @access  Private/Doctor or HospitalAdmin
router.get('/:id/analytics/trends', protect, asyncHandler(async (req, res) => {
  const doctorAnalytics = require('../services/doctorAnalyticsService');
  const { months = 6 } = req.query;

  const trends = await doctorAnalytics.getEfficiencyTrends(req.params.id, parseInt(months));

  res.status(200).json({
    success: true,
    trends
  });
}));

// @route   GET /api/doctors/compare
// @desc    Compare doctors within hospital
// @access  Private/HospitalAdmin
router.get('/compare/all', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const doctorAnalytics = require('../services/doctorAnalyticsService');
  const { specialty } = req.query;

  const comparison = await doctorAnalytics.getDoctorComparison(
    req.user.hospitalId,
    specialty || null
  );

  res.status(200).json({
    success: true,
    comparison
  });
}));

// @route   GET /api/doctors/:id/no-show-alerts
// @desc    Get no-show risk alerts for doctor's appointments
// @access  Private/Doctor or HospitalAdmin
router.get('/:id/no-show-alerts', protect, asyncHandler(async (req, res) => {
  const queueManager = require('../services/queueManager');
  const { date } = req.query;

  const targetDate = date ? new Date(date) : new Date();
  const alerts = await queueManager.getNoShowRiskAlerts(req.user.hospitalId, targetDate);

  // Filter to only this doctor's appointments
  const doctorAlerts = {
    high: alerts.high.filter(a => a.doctorId?.toString() === req.params.id),
    medium: alerts.medium.filter(a => a.doctorId?.toString() === req.params.id),
    total: 0
  };
  doctorAlerts.total = doctorAlerts.high.length + doctorAlerts.medium.length;

  res.status(200).json({
    success: true,
    alerts: doctorAlerts
  });
}));

// @route   POST /api/doctors/:id/queue/auto-no-show
// @desc    Trigger auto no-show detection for doctor's queue
// @access  Private/Doctor or HospitalAdmin
router.post('/:id/queue/auto-no-show', protect, asyncHandler(async (req, res) => {
  const queueManager = require('../services/queueManager');

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Check authorization
  if (req.user.role === 'doctor' && doctor.userId.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  const results = await queueManager.autoDetectNoShows(doctor.hospitalId);

  // Emit socket update if no-shows were detected
  if (results.noShowsDetected > 0) {
    const io = req.app.get('io');
    if (io) {
      io.to(`queue:${req.params.id}`).emit('queue:update', {
        noShowsDetected: results.noShowsDetected
      });
    }
  }

  res.status(200).json({
    success: true,
    results
  });
}));

// @route   POST /api/doctors/:id/queue/check-in
// @desc    Check in a patient
// @access  Private
router.post('/:id/queue/check-in', protect, asyncHandler(async (req, res) => {
  const queueManager = require('../services/queueManager');
  const { appointmentId } = req.body;

  if (!appointmentId) {
    throw new AppError('Appointment ID is required', 400);
  }

  const result = await queueManager.checkInPatient(appointmentId);

  // Emit socket update
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.id}`).emit('queue:check-in', {
      appointmentId,
      queueNumber: result.queueNumber,
      estimatedWait: result.estimatedWait
    });
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   GET /api/doctors/:id/appointments
// @desc    Get doctor's appointments
// @access  Private/Doctor
router.get('/:id/appointments', protect, asyncHandler(async (req, res) => {
  const { date, status } = req.query;

  const query = { doctorId: req.params.id };

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    query.date = { $gte: startDate, $lt: endDate };
  }

  if (status) {
    query.status = status;
  }

  const appointments = await Appointment.find(query)
    .populate('patientId', 'name phone gender')
    .sort({ date: 1, slotTime: 1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    appointments
  });
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const { Doctor, User, Appointment, Queue } = require('../models');
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
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

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

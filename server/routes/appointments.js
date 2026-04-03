const express = require('express');
const router = express.Router();
const { Appointment, Doctor, Queue, User, Notification, Hospital } = require('../models');
const { protect, asyncHandler, AppError } = require('../middleware');
const slotGenerator = require('../services/slotGenerator');
const calendarService = require('../services/calendarService');
const notificationService = require('../services/notificationService');

// @route   POST /api/appointments
// @desc    Book appointment
// @access  Private
router.post('/', protect, asyncHandler(async (req, res) => {
  const {
    doctorId,
    date,
    slotTime,
    triageData,
    chatSessionId,
    bookingSource = 'web_chat'
  } = req.body;

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Verify slot is available
  const availableSlots = await slotGenerator.getAvailableSlots(doctor, new Date(date));
  const isSlotAvailable = availableSlots.some(
    slot => slot.time === slotTime && slot.available
  );

  if (!isSlotAvailable) {
    throw new AppError('Selected slot is no longer available', 400);
  }

  // Get ML predictions
  let predictedNoShowProbability = 0;
  let predictedDuration = doctor.slotDuration;

  try {
    const mlService = require('../services/mlService');
    const predictions = await mlService.getPredictions(req.user.id, triageData);
    predictedNoShowProbability = predictions.noShowProbability;
    predictedDuration = predictions.duration;
  } catch (err) {
    console.log('ML prediction failed, using defaults');
  }

  // Create appointment
  const appointment = await Appointment.create({
    patientId: req.user.id,
    doctorId,
    hospitalId: doctor.hospitalId,
    date: new Date(date),
    slotTime,
    slotEndTime: calculateEndTime(slotTime, doctor.slotDuration),
    status: 'booked',
    bookingSource,
    triageData,
    chatSessionId,
    predictedNoShowProbability,
    predictedDuration
  });

  // Add to queue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  if (appointmentDate.getTime() === today.getTime()) {
    // Today's appointment - add to queue immediately
    let queue = await Queue.findOne({
      doctorId,
      date: today
    });

    if (!queue) {
      queue = await Queue.create({
        doctorId,
        hospitalId: doctor.hospitalId,
        date: today
      });
    }

    const queueNumber = queue.addPatient(
      appointment._id,
      req.user.id,
      slotTime,
      triageData?.urgencyScore || 3
    );

    await queue.save();
    appointment.queueNumber = queueNumber;
    await appointment.save();
  }

  // Update user stats
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { totalAppointments: 1 }
  });

  // Create notification
  await Notification.createAppointmentNotification(
    req.user.id,
    'appointment_booked',
    appointment._id
  );

  // Sync to Google Calendar if connected
  try {
    const hospital = await Hospital.findById(doctor.hospitalId);
    if (hospital && hospital.googleCalendar?.connected && hospital.features?.googleCalendarEnabled) {
      const doctorUser = await User.findById(doctor.userId);
      const calendarEvent = await calendarService.createAppointmentEvent(hospital, {
        patientName: req.user.name,
        patientEmail: req.user.email,
        patientPhone: req.user.phone,
        doctorName: doctorUser?.name || 'Doctor',
        specialty: doctor.specialty,
        date: new Date(date).toISOString().split('T')[0],
        slotTime,
        slotEndTime: calculateEndTime(slotTime, doctor.slotDuration),
        triageSummary: triageData?.summary || '',
        hospitalName: hospital.name,
        hospitalAddress: hospital.address ? `${hospital.address.street || ''}, ${hospital.address.city}, ${hospital.address.state}` : ''
      });

      // Save Google Calendar event ID to appointment
      appointment.googleCalendarEventId = calendarEvent.eventId;
      await appointment.save();
    }
  } catch (calendarError) {
    console.error('Google Calendar sync failed:', calendarError.message);
    // Don't fail the appointment creation if calendar sync fails
  }

  // Send email confirmation with .ics calendar file (async - don't wait)
  notificationService.sendAppointmentConfirmation(appointment).catch(err => {
    console.error('Email notification failed:', err.message);
  });

  // Populate and return
  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate('doctorId', 'specialty consultationFee')
    .populate('hospitalId', 'name address');

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    appointment: populatedAppointment
  });
}));

// @route   GET /api/appointments
// @desc    Get user's appointments
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const { status, upcoming } = req.query;

  const query = { patientId: req.user.id };

  if (status) {
    query.status = status;
  }

  if (upcoming === 'true') {
    query.date = { $gte: new Date() };
    query.status = { $nin: ['cancelled', 'completed', 'no_show'] };
  }

  const appointments = await Appointment.find(query)
    .populate({
      path: 'doctorId',
      select: 'specialty consultationFee',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospitalId', 'name address')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    appointments
  });
}));

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate('hospitalId', 'name address phone')
    .populate('patientId', 'name phone gender');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Check authorization
  const isPatient = appointment.patientId._id.toString() === req.user.id;
  const isDoctor = appointment.doctorId.userId._id.toString() === req.user.id;
  const isAdmin = req.user.role === 'hospital_admin';

  if (!isPatient && !isDoctor && !isAdmin) {
    throw new AppError('Not authorized', 403);
  }

  res.status(200).json({
    success: true,
    appointment
  });
}));

// @route   PUT /api/appointments/:id/check-in
// @desc    Patient check-in
// @access  Private
router.put('/:id/check-in', protect, asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.patientId.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  if (appointment.status !== 'booked' && appointment.status !== 'confirmed') {
    throw new AppError(`Cannot check in with status: ${appointment.status}`, 400);
  }

  appointment.status = 'checked_in';
  appointment.checkInTime = new Date();
  await appointment.save();

  // Update queue entry
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({
    doctorId: appointment.doctorId,
    date: today
  });

  if (queue) {
    const entry = queue.entries.find(
      e => e.appointmentId.toString() === appointment._id.toString()
    );
    if (entry) {
      entry.checkInTime = new Date();
      entry.status = 'waiting';
      queue.recalculateWaitTimes();
      await queue.save();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`queue:${appointment.doctorId}`).emit('queue:update', {
          queueId: queue._id,
          summary: queue.getSummary()
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    message: 'Checked in successfully',
    appointment
  });
}));

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel appointment
// @access  Private
router.put('/:id/cancel', protect, asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.patientId.toString() !== req.user.id &&
      req.user.role !== 'doctor' &&
      req.user.role !== 'hospital_admin') {
    throw new AppError('Not authorized', 403);
  }

  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
    throw new AppError(`Cannot cancel appointment with status: ${appointment.status}`, 400);
  }

  appointment.status = 'cancelled';
  appointment.cancellationReason = reason;
  appointment.cancelledBy = req.user.role === 'patient' ? 'patient' :
                            req.user.role === 'doctor' ? 'doctor' : 'hospital';
  await appointment.save();

  // Update user stats
  await User.findByIdAndUpdate(appointment.patientId, {
    $inc: { cancelledCount: 1 }
  });

  // Create notification
  await Notification.createAppointmentNotification(
    appointment.patientId,
    'appointment_cancelled',
    appointment._id
  );

  // Delete Google Calendar event if exists
  if (appointment.googleCalendarEventId) {
    try {
      const hospital = await Hospital.findById(appointment.hospitalId);
      if (hospital && hospital.googleCalendar?.connected) {
        await calendarService.deleteAppointmentEvent(hospital, appointment.googleCalendarEventId);
        appointment.googleCalendarEventId = null;
        await appointment.save();
      }
    } catch (calendarError) {
      console.error('Failed to delete Google Calendar event:', calendarError.message);
    }
  }

  // Send cancellation email notification (async - don't wait)
  notificationService.sendAppointmentCancellation(appointment, reason).catch(err => {
    console.error('Cancellation email failed:', err.message);
  });

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled',
    appointment
  });
}));

// @route   POST /api/appointments/:id/reschedule
// @desc    Reschedule appointment
// @access  Private
router.post('/:id/reschedule', protect, asyncHandler(async (req, res) => {
  const { newDate, newSlotTime, reason } = req.body;

  const oldAppointment = await Appointment.findById(req.params.id);

  if (!oldAppointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Allow patient or hospital admin to reschedule
  if (oldAppointment.patientId.toString() !== req.user.id && req.user.role !== 'hospital_admin') {
    throw new AppError('Not authorized', 403);
  }

  if (oldAppointment.rescheduleCount >= 2) {
    throw new AppError('Maximum reschedule limit reached', 400);
  }

  // Mark old appointment as rescheduled
  oldAppointment.status = 'rescheduled';
  oldAppointment.rescheduleReason = reason;
  await oldAppointment.save();

  // Create new appointment
  const newAppointment = await Appointment.create({
    patientId: oldAppointment.patientId,
    doctorId: oldAppointment.doctorId,
    hospitalId: oldAppointment.hospitalId,
    date: new Date(newDate),
    slotTime: newSlotTime,
    status: 'booked',
    bookingSource: 'reschedule',
    triageData: oldAppointment.triageData,
    isRescheduled: true,
    originalAppointmentId: oldAppointment._id,
    rescheduleCount: oldAppointment.rescheduleCount + 1
  });

  // Create notification
  await Notification.createAppointmentNotification(
    oldAppointment.patientId,
    'appointment_rescheduled',
    newAppointment._id
  );

  // Send reschedule email notification with new .ics file (async - don't wait)
  notificationService.sendAppointmentRescheduled(oldAppointment, newAppointment, reason).catch(err => {
    console.error('Reschedule email failed:', err.message);
  });

  res.status(200).json({
    success: true,
    message: 'Appointment rescheduled',
    oldAppointment,
    newAppointment
  });
}));

// @route   POST /api/appointments/:id/feedback
// @desc    Submit appointment feedback
// @access  Private
router.post('/:id/feedback', protect, asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.patientId.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  if (appointment.status !== 'completed') {
    throw new AppError('Can only submit feedback for completed appointments', 400);
  }

  appointment.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  await appointment.save();

  // Update doctor rating
  const doctor = await Doctor.findById(appointment.doctorId);
  const newCount = doctor.rating.count + 1;
  const newAverage = ((doctor.rating.average * doctor.rating.count) + rating) / newCount;

  doctor.rating.average = Math.round(newAverage * 10) / 10;
  doctor.rating.count = newCount;
  await doctor.save();

  res.status(200).json({
    success: true,
    message: 'Feedback submitted',
    feedback: appointment.feedback
  });
}));

// ========================================
// MANUAL BOOKING ROUTES (Receptionist/Admin)
// ========================================

// @route   GET /api/appointments/patients/search
// @desc    Search patients by name or phone
// @access  Private/HospitalAdmin
router.get('/patients/search', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hospital_admin') {
    throw new AppError('Not authorized', 403);
  }

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      patients: []
    });
  }

  const patients = await User.find({
    role: 'patient',
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ]
  })
    .select('name email phone gender dateOfBirth')
    .limit(10);

  res.status(200).json({
    success: true,
    patients
  });
}));

// @route   POST /api/appointments/patients/quick-register
// @desc    Quick register a walk-in patient
// @access  Private/HospitalAdmin
router.post('/patients/quick-register', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hospital_admin') {
    throw new AppError('Not authorized', 403);
  }

  const { name, phone, email, gender, dateOfBirth } = req.body;

  if (!name || !phone) {
    throw new AppError('Name and phone are required', 400);
  }

  // Check if patient already exists
  const existingPatient = await User.findOne({ phone });
  if (existingPatient) {
    return res.status(200).json({
      success: true,
      patient: existingPatient,
      message: 'Patient already exists'
    });
  }

  // Create new patient with temporary password
  const tempPassword = 'Patient@' + phone.slice(-4);

  const patient = await User.create({
    name,
    phone,
    email: email || `${phone}@walkin.medqueue.ai`,
    password: tempPassword,
    gender,
    dateOfBirth,
    role: 'patient',
    isVerified: true
  });

  res.status(201).json({
    success: true,
    patient: {
      _id: patient._id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      gender: patient.gender
    },
    tempPassword,
    message: 'Patient registered successfully'
  });
}));

// @route   GET /api/appointments/patients/:id
// @desc    Get patient details by ID
// @access  Private/HospitalAdmin
router.get('/patients/:id', protect, asyncHandler(async (req, res) => {
  const patient = await User.findById(req.params.id)
    .select('-password -fcmToken');

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  res.status(200).json({
    success: true,
    patient
  });
}));

// @route   GET /api/appointments/patients/:id/history
// @desc    Get patient's appointment history
// @access  Private/HospitalAdmin
router.get('/patients/:id/history', protect, asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patientId: req.params.id })
    .populate('doctorId', 'specialty userId')
    .populate({
      path: 'doctorId',
      populate: {
        path: 'userId',
        select: 'name'
      }
    })
    .populate('hospitalId', 'name')
    .sort({ date: -1, slotTime: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    appointments
  });
}));

// @route   POST /api/appointments/manual
// @desc    Manually book appointment (by receptionist/admin)
// @access  Private/HospitalAdmin
router.post('/manual', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'hospital_admin') {
    throw new AppError('Not authorized', 403);
  }

  const {
    patientId,
    doctorId,
    date,
    slotTime,
    appointmentType,
    notes,
    urgencyScore
  } = req.body;

  // Validate required fields
  if (!patientId || !doctorId || !date || !slotTime) {
    throw new AppError('Patient, doctor, date and time slot are required', 400);
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const patient = await User.findById(patientId);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  // Verify slot is available
  const availableSlots = await slotGenerator.getAvailableSlots(doctor, new Date(date));
  const isSlotAvailable = availableSlots.some(
    slot => slot.time === slotTime && slot.available
  );

  if (!isSlotAvailable) {
    throw new AppError('Selected slot is no longer available', 400);
  }

  // Create appointment
  const appointment = await Appointment.create({
    patientId,
    doctorId,
    hospitalId: doctor.hospitalId,
    date: new Date(date),
    slotTime,
    slotEndTime: calculateEndTime(slotTime, doctor.slotDuration),
    status: 'booked',
    bookingSource: 'manual',
    triageData: {
      symptoms: notes ? [notes] : [],
      urgencyScore: urgencyScore || 3,
      preVisitSummary: notes || ''
    }
  });

  // Add to queue if today's appointment
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  if (appointmentDate.getTime() === today.getTime()) {
    let queue = await Queue.findOne({
      doctorId,
      date: today
    });

    if (!queue) {
      queue = await Queue.create({
        doctorId,
        hospitalId: doctor.hospitalId,
        date: today
      });
    }

    const queueNumber = queue.addPatient(
      appointment._id,
      patientId,
      slotTime,
      urgencyScore || 3
    );

    await queue.save();
    appointment.queueNumber = queueNumber;
    await appointment.save();
  }

  // Update user stats
  await User.findByIdAndUpdate(patientId, {
    $inc: { totalAppointments: 1 }
  });

  // Create notification
  await Notification.createAppointmentNotification(
    patientId,
    'appointment_booked',
    appointment._id
  );

  // Sync to Google Calendar if connected
  try {
    const hospital = await Hospital.findById(doctor.hospitalId);
    if (hospital && hospital.googleCalendar?.connected && hospital.features?.googleCalendarEnabled) {
      const doctorUser = await User.findById(doctor.userId);
      const calendarEvent = await calendarService.createAppointmentEvent(hospital, {
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        doctorName: doctorUser?.name || 'Doctor',
        specialty: doctor.specialty,
        date: new Date(date).toISOString().split('T')[0],
        slotTime,
        slotEndTime: calculateEndTime(slotTime, doctor.slotDuration),
        triageSummary: notes || '',
        hospitalName: hospital.name,
        hospitalAddress: hospital.address ? `${hospital.address.street || ''}, ${hospital.address.city}, ${hospital.address.state}` : ''
      });

      appointment.googleCalendarEventId = calendarEvent.eventId;
      await appointment.save();
    }
  } catch (calendarError) {
    console.error('Google Calendar sync failed:', calendarError.message);
  }

  // Send email confirmation with .ics calendar file (async - don't wait)
  notificationService.sendAppointmentConfirmation(appointment).catch(err => {
    console.error('Email notification failed:', err.message);
  });

  // Populate and return
  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate('patientId', 'name phone email')
    .populate('doctorId', 'specialty consultationFee')
    .populate('hospitalId', 'name address');

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    appointment: populatedAppointment
  });
}));

// Helper function
function calculateEndTime(startTime, duration) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

module.exports = router;

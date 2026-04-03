const express = require('express');
const router = express.Router();
const { ChatSession, User, Appointment } = require('../models');
const { protect, optionalAuth, asyncHandler, AppError } = require('../middleware');
const openaiService = require('../services/openaiService');

// @route   POST /api/chat/start
// @desc    Start a new chat session
// @access  Public (with optional auth)
router.post('/start', optionalAuth, asyncHandler(async (req, res) => {
  const { sessionType = 'web_chat', guestInfo } = req.body;

  let patientContext = null;
  let patientHistory = null;

  // If user is logged in, fetch their context
  if (req.user) {
    const user = await User.findById(req.user.id);

    patientContext = {
      name: user.name,
      age: user.getAge(),
      gender: user.gender,
      medicalHistory: user.medicalHistory || [],
      allergies: user.allergies || [],
      totalAppointments: user.totalAppointments,
      noShowCount: user.noShowCount
    };

    // Fetch last visit history
    const lastAppointments = await Appointment.find({
      patientId: user._id,
      status: 'completed'
    })
      .sort({ date: -1 })
      .limit(5)
      .populate({
        path: 'doctorId',
        select: 'specialty',
        populate: { path: 'userId', select: 'name' }
      });

    if (lastAppointments.length > 0) {
      const lastVisit = lastAppointments[0];

      // Get frequent specialties
      const specialtyCounts = {};
      lastAppointments.forEach(apt => {
        const specialty = apt.doctorId?.specialty;
        if (specialty) {
          specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
        }
      });

      const frequentSpecialties = Object.entries(specialtyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([specialty]) => specialty);

      // Get recent symptoms
      const recentSymptoms = [...new Set(
        lastAppointments
          .filter(apt => apt.triageData?.symptoms)
          .flatMap(apt => apt.triageData.symptoms)
      )].slice(0, 10);

      patientHistory = {
        totalVisits: await Appointment.countDocuments({
          patientId: user._id,
          status: 'completed'
        }),
        lastVisit: {
          date: lastVisit.date,
          symptoms: lastVisit.triageData?.symptoms || [],
          specialty: lastVisit.doctorId?.specialty,
          doctor: lastVisit.doctorId?.userId?.name
        },
        frequentSpecialties,
        recentSymptoms
      };
    }
  }

  // Create chat session
  const chatSession = await ChatSession.create({
    userId: req.user?.id || null,
    guestInfo: !req.user ? guestInfo : null,
    sessionType,
    patientContext,
    patientHistory,
    status: 'active'
  });

  // Generate greeting message
  const greeting = openaiService.generateGreeting(patientContext, patientHistory);

  // Add system context and greeting to messages
  chatSession.addMessage('assistant', greeting);
  await chatSession.save();

  res.status(201).json({
    success: true,
    sessionId: chatSession._id,
    greeting,
    isReturningPatient: !!patientHistory
  });
}));

// @route   POST /api/chat/:sessionId/message
// @desc    Send message in chat
// @access  Public (with optional auth)
router.post('/:sessionId/message', optionalAuth, asyncHandler(async (req, res) => {
  const { message } = req.body;

  const chatSession = await ChatSession.findById(req.params.sessionId);

  if (!chatSession) {
    throw new AppError('Chat session not found', 404);
  }

  if (chatSession.status !== 'active') {
    throw new AppError('Chat session is no longer active', 400);
  }

  // Add user message
  chatSession.addMessage('user', message);

  // Get AI response
  const aiResponse = await openaiService.processMessage(
    chatSession.getConversationHistory(),
    chatSession.patientContext,
    chatSession.patientHistory
  );

  // Add AI response
  chatSession.addMessage('assistant', aiResponse.message);

  // If triage function was called, save the result
  if (aiResponse.triageResult) {
    chatSession.triageResult = aiResponse.triageResult;
    chatSession.recommendedSpecialty = aiResponse.triageResult.recommendedSpecialty;
    chatSession.status = 'triage_complete';
  }

  // Update token usage
  if (aiResponse.tokenUsage) {
    chatSession.totalTokensUsed += aiResponse.tokenUsage.total;
  }

  await chatSession.save();

  res.status(200).json({
    success: true,
    response: aiResponse.message,
    triageComplete: !!aiResponse.triageResult,
    triageResult: aiResponse.triageResult || null
  });
}));

// @route   GET /api/chat/:sessionId
// @desc    Get chat session
// @access  Private
router.get('/:sessionId', optionalAuth, asyncHandler(async (req, res) => {
  const chatSession = await ChatSession.findById(req.params.sessionId)
    .populate('appointmentId');

  if (!chatSession) {
    throw new AppError('Chat session not found', 404);
  }

  res.status(200).json({
    success: true,
    chatSession
  });
}));

// @route   POST /api/chat/:sessionId/book
// @desc    Book appointment after triage
// @access  Private
router.post('/:sessionId/book', protect, asyncHandler(async (req, res) => {
  const { doctorId, date, slotTime } = req.body;

  const chatSession = await ChatSession.findById(req.params.sessionId);

  if (!chatSession) {
    throw new AppError('Chat session not found', 404);
  }

  if (chatSession.status !== 'triage_complete') {
    throw new AppError('Triage must be completed before booking', 400);
  }

  // Create appointment through appointment route logic
  const { Doctor, Hospital } = require('../models');
  const slotGenerator = require('../services/slotGenerator');

  const doctor = await Doctor.findById(doctorId);

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Verify slot availability
  const slots = await slotGenerator.getAvailableSlots(doctor, new Date(date));
  const isAvailable = slots.some(s => s.time === slotTime && s.available);

  if (!isAvailable) {
    throw new AppError('Slot no longer available', 400);
  }

  // Create appointment
  const appointment = await Appointment.create({
    patientId: req.user.id,
    doctorId,
    hospitalId: doctor.hospitalId,
    date: new Date(date),
    slotTime,
    status: 'booked',
    bookingSource: chatSession.sessionType,
    triageData: chatSession.triageResult,
    chatSessionId: chatSession._id
  });

  // Update chat session
  chatSession.appointmentId = appointment._id;
  chatSession.recommendedDoctorId = doctorId;
  chatSession.status = 'booking_complete';
  chatSession.completedAt = new Date();
  chatSession.sessionDuration = chatSession.calculateDuration();
  await chatSession.save();

  // Populate appointment
  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospitalId', 'name address');

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    appointment: populatedAppointment
  });
}));

// @route   GET /api/chat/:sessionId/doctors
// @desc    Get recommended doctors based on triage
// @access  Public
router.get('/:sessionId/doctors', optionalAuth, asyncHandler(async (req, res) => {
  const { hospitalId, date } = req.query;

  const chatSession = await ChatSession.findById(req.params.sessionId);

  if (!chatSession) {
    throw new AppError('Chat session not found', 404);
  }

  if (!chatSession.triageResult?.specialist) {
    throw new AppError('Triage not completed', 400);
  }

  const { Doctor } = require('../models');
  const slotGenerator = require('../services/slotGenerator');

  const query = {
    specialty: chatSession.triageResult.specialist,
    isActive: true,
    isAcceptingPatients: true
  };

  if (hospitalId) {
    query.hospitalId = hospitalId;
  }

  const doctors = await Doctor.find(query)
    .populate('userId', 'name')
    .populate('hospitalId', 'name address')
    .limit(10);

  // Get available slots for each doctor
  const doctorsWithSlots = await Promise.all(
    doctors.map(async (doctor) => {
      const slots = date
        ? await slotGenerator.getAvailableSlots(doctor, new Date(date))
        : [];

      return {
        ...doctor.toObject(),
        availableSlots: slots.filter(s => s.available).slice(0, 5)
      };
    })
  );

  // Sort by urgency-appropriate availability
  const urgency = chatSession.triageResult.urgencyScore || 3;

  doctorsWithSlots.sort((a, b) => {
    // For high urgency, prioritize doctors with immediate availability
    if (urgency >= 4) {
      return b.availableSlots.length - a.availableSlots.length;
    }
    // Otherwise sort by rating
    return (b.rating?.average || 0) - (a.rating?.average || 0);
  });

  res.status(200).json({
    success: true,
    specialty: chatSession.triageResult.specialist,
    urgencyScore: chatSession.triageResult.urgencyScore,
    doctors: doctorsWithSlots
  });
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const { Waitlist, Doctor } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');
const slotRecoveryService = require('../services/slotRecoveryService');

// @route   POST /api/waitlist/:doctorId/join
// @desc    Join waitlist for a doctor
// @access  Private/Patient
router.post('/:doctorId/join', protect, asyncHandler(async (req, res) => {
  const { preferredSlots, reason, urgencyScore, triageData, contactPreference } = req.body;

  const result = await slotRecoveryService.addToWaitlist(
    req.params.doctorId,
    req.user.id,
    { preferredSlots, reason, urgencyScore, triageData, contactPreference }
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('waitlist:joined', {
      position: result.position,
      totalWaiting: result.totalWaiting
    });
  }

  res.status(201).json({
    success: true,
    message: `You are #${result.position} on the waitlist`,
    ...result
  });
}));

// @route   GET /api/waitlist/my-status
// @desc    Get patient's waitlist status across all doctors
// @access  Private/Patient
router.get('/my-status', protect, asyncHandler(async (req, res) => {
  const entries = await slotRecoveryService.getPatientWaitlistStatus(req.user.id);

  res.status(200).json({
    success: true,
    entries,
    totalWaitlists: entries.length
  });
}));

// @route   GET /api/waitlist/:doctorId/status
// @desc    Get patient's status in a specific doctor's waitlist
// @access  Private/Patient
router.get('/:doctorId/status', protect, asyncHandler(async (req, res) => {
  const entries = await slotRecoveryService.getPatientWaitlistStatus(
    req.user.id,
    req.params.doctorId
  );

  if (entries.length === 0) {
    return res.status(200).json({
      success: true,
      inWaitlist: false,
      message: 'You are not in this waitlist'
    });
  }

  res.status(200).json({
    success: true,
    inWaitlist: true,
    ...entries[0]
  });
}));

// @route   POST /api/waitlist/:doctorId/respond/:entryId
// @desc    Respond to slot offer (accept/decline)
// @access  Private/Patient
router.post('/:doctorId/respond/:entryId', protect, asyncHandler(async (req, res) => {
  const { accepted } = req.body;

  if (typeof accepted !== 'boolean') {
    throw new AppError('Please specify whether you accept or decline', 400);
  }

  const result = await slotRecoveryService.handleSlotResponse(
    req.params.entryId,
    req.params.doctorId,
    accepted,
    req.user.id
  );

  // Emit socket events
  const io = req.app.get('io');
  if (io) {
    if (accepted && result.appointment) {
      io.to(`queue:${req.params.doctorId}`).emit('waitlist:booked', {
        appointmentId: result.appointment._id
      });
    }
  }

  res.status(200).json({
    success: true,
    ...result
  });
}));

// @route   DELETE /api/waitlist/:doctorId/leave
// @desc    Leave waitlist
// @access  Private/Patient
router.delete('/:doctorId/leave', protect, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const waitlist = await Waitlist.findOne({
    doctorId: req.params.doctorId,
    date: today
  });

  if (!waitlist) {
    throw new AppError('Waitlist not found', 404);
  }

  const entry = waitlist.entries.find(
    e => e.patientId.toString() === req.user.id &&
         ['waiting', 'notified'].includes(e.status)
  );

  if (!entry) {
    throw new AppError('You are not in this waitlist', 404);
  }

  entry.status = 'declined';
  entry.notes = 'Left waitlist voluntarily';
  await waitlist.save();

  res.status(200).json({
    success: true,
    message: 'You have left the waitlist'
  });
}));

// @route   GET /api/waitlist/hospital/:hospitalId/summary
// @desc    Get hospital-wide waitlist summary
// @access  Private/Hospital Admin
router.get('/hospital/:hospitalId/summary', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summary = await Waitlist.getHospitalWaitlistSummary(req.params.hospitalId, today);

  const totalWaiting = summary.reduce((sum, s) => sum + s.waiting, 0);
  const totalNotified = summary.reduce((sum, s) => sum + s.notified, 0);
  const totalBooked = summary.reduce((sum, s) => sum + s.booked, 0);

  res.status(200).json({
    success: true,
    summary: {
      totalWaiting,
      totalNotified,
      totalBooked,
      byDoctor: summary
    }
  });
}));

// @route   GET /api/waitlist/:doctorId
// @desc    Get waitlist for a doctor
// @access  Private/Doctor/Hospital Admin
router.get('/:doctorId', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const waitlist = await Waitlist.findOne({
    doctorId: req.params.doctorId,
    date: today
  }).populate('entries.patientId', 'name phone email');

  if (!waitlist) {
    return res.status(200).json({
      success: true,
      waitlist: null,
      entries: [],
      totalWaiting: 0
    });
  }

  const entries = waitlist.entries
    .filter(e => ['waiting', 'notified'].includes(e.status))
    .map(e => ({
      entryId: e._id,
      patientId: e.patientId?._id,
      patientName: e.patientId?.name,
      patientPhone: e.patientId?.phone,
      urgencyScore: e.urgencyScore,
      reason: e.reason,
      status: e.status,
      joinedAt: e.joinedAt,
      notifiedAt: e.notifiedAt,
      expiresAt: e.notificationExpiry,
      preferredSlots: e.preferredSlots
    }));

  res.status(200).json({
    success: true,
    waitlistId: waitlist._id,
    entries,
    totalWaiting: entries.filter(e => e.status === 'waiting').length,
    totalNotified: entries.filter(e => e.status === 'notified').length
  });
}));

// @route   POST /api/waitlist/:doctorId/notify-next
// @desc    Manually notify next patient in waitlist
// @access  Private/Doctor/Hospital Admin
router.post('/:doctorId/notify-next', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { slotTime } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await slotRecoveryService.tryFillSlotFromWaitlist(
    req.params.doctorId,
    slotTime || new Date().toTimeString().slice(0, 5),
    today
  );

  if (!result.success) {
    return res.status(200).json({
      success: false,
      message: result.reason
    });
  }

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`queue:${req.params.doctorId}`).emit('waitlist:notified', {
      patientName: result.patientName,
      slotTime: result.slotTime
    });
  }

  res.status(200).json({
    success: true,
    message: `${result.patientName} has been notified`,
    ...result
  });
}));

// @route   GET /api/waitlist/:doctorId/overbooking
// @desc    Get overbooking recommendation based on no-show history
// @access  Private/Doctor/Hospital Admin
router.get('/:doctorId/overbooking', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const analysis = await slotRecoveryService.calculateOverbookingLevel(req.params.doctorId);

  res.status(200).json({
    success: true,
    ...analysis
  });
}));

// @route   POST /api/waitlist/hospital/:hospitalId/process-expired
// @desc    Process expired notifications and notify next candidates
// @access  Private/Hospital Admin
router.post('/hospital/:hospitalId/process-expired', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const results = await slotRecoveryService.processExpiredNotifications(req.params.hospitalId);

  res.status(200).json({
    success: true,
    ...results
  });
}));

module.exports = router;

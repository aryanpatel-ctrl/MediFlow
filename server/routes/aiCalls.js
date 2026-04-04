const express = require('express');
const router = express.Router();
const { AICallLog, Appointment } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');
const vapiService = require('../services/vapiService');

router.post('/webhook/vapi', asyncHandler(async (req, res) => {
  if (!vapiService.verifyWebhookSignature(req)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Vapi webhook signature'
    });
  }

  const message = vapiService.getMessagePayload(req);

  if (message.type === 'tool-calls') {
    try {
      const response = await vapiService.processToolCallsWebhook(message);
      return res.status(200).json(response);
    } catch (error) {
      const toolCallList = message.toolCallList || message.toolWithToolCallList || [];
      return res.status(200).json({
        results: toolCallList.map((entry) => ({
          toolCallId: entry.toolCall?.id || entry.id,
          error: String(error.message || 'Tool call processing failed').replace(/\s+/g, ' ').trim()
        }))
      });
    }
  }

  try {
    await vapiService.processInformationalWebhook(message);
  } catch (error) {
    console.error('Failed to process Vapi webhook:', error.message);
  }

  res.status(200).json({ success: true });
}));

router.post('/process-due', protect, authorize('hospital_admin'), asyncHandler(async (_req, res) => {
  const [dueResult, retryResult] = await Promise.all([
    vapiService.processDueReminderCalls(new Date()),
    vapiService.processRetryReminderCalls(new Date())
  ]);

  res.status(200).json({
    success: true,
    due: dueResult,
    retry: retryResult
  });
}));

router.post('/appointments/:appointmentId/trigger', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId).select('hospitalId');
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.hospitalId?.toString() !== req.user.hospitalId?.toString()) {
    throw new AppError('Not authorized to trigger a call for this appointment', 403);
  }

  const callLog = await vapiService.triggerReminderCallForAppointment(req.params.appointmentId, {
    triggerSource: 'admin'
  });

  res.status(201).json({
    success: true,
    message: 'AI reminder call triggered',
    callLog
  });
}));

router.get('/logs', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const { appointmentId, status, page = 1, limit = 20 } = req.query;
  const query = {
    hospitalId: req.user.hospitalId
  };

  if (appointmentId) {
    query.appointmentId = appointmentId;
  }

  if (status) {
    query.status = status;
  }

  const logs = await AICallLog.find(query)
    .populate('appointmentId', 'date slotTime status attendanceConfirmation')
    .populate('patientId', 'name phone')
    .populate({
      path: 'doctorId',
      select: 'specialty userId',
      populate: { path: 'userId', select: 'name' }
    })
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await AICallLog.countDocuments(query);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    logs
  });
}));

module.exports = router;

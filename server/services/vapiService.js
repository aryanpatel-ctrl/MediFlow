const axios = require('axios');
const { Appointment, AICallLog } = require('../models');
const { AppError } = require('../middleware');
const {
  markAppointmentConfirmed,
  cancelAppointmentFromAICall,
  createRescheduleRequestFromAICall
} = require('./appointmentAutomationService');

const VAPI_BASE_URL = (process.env.VAPI_BASE_URL || 'https://api.vapi.ai').replace(/\/$/, '');
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;
const AI_CALL_LOOKAHEAD_MINUTES = parseInt(process.env.AI_CALL_LOOKAHEAD_MINUTES || '60', 10);
const AI_CALL_WINDOW_MINUTES = parseInt(process.env.AI_CALL_WINDOW_MINUTES || '5', 10);
const AI_CALL_MAX_ATTEMPTS = parseInt(process.env.AI_CALL_MAX_ATTEMPTS || '1', 10);
const AI_CALL_RETRY_MINUTES = parseInt(process.env.AI_CALL_RETRY_MINUTES || '15', 10);

function isConfigured() {
  return Boolean(VAPI_API_KEY && VAPI_PHONE_NUMBER_ID);
}

function getWebhookBaseUrl() {
  return process.env.APP_BASE_URL || process.env.SERVER_PUBLIC_URL || '';
}

function combineDateAndSlot(dateValue, slotTime) {
  const date = new Date(dateValue);
  const [hoursText = '0', minutesText = '0'] = String(slotTime || '00:00').split(':');

  date.setHours(Number.parseInt(hoursText, 10) || 0, Number.parseInt(minutesText, 10) || 0, 0, 0);
  return date;
}

function normalizePhoneNumber(phone) {
  if (!phone) {
    return null;
  }

  const trimmed = String(phone).trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

function buildToolDefinitions() {
  return [
    {
      name: 'confirm_appointment',
      description: 'Use this when the patient clearly confirms they will attend the appointment as scheduled.',
      parameters: {
        type: 'object',
        properties: {
          confirmationNote: {
            type: 'string',
            description: 'Short summary of what the patient said.'
          }
        },
        required: []
      }
    },
    {
      name: 'request_reschedule',
      description: 'Use this when the patient wants to keep care but move the appointment to a new date or time.',
      parameters: {
        type: 'object',
        properties: {
          preferredDate: {
            type: 'string',
            description: 'Requested new date in YYYY-MM-DD format.'
          },
          preferredSlotTime: {
            type: 'string',
            description: 'Requested new slot time in HH:mm 24-hour format.'
          },
          reason: {
            type: 'string',
            description: 'Reason the patient wants to reschedule.'
          }
        },
        required: ['preferredDate', 'preferredSlotTime', 'reason']
      }
    },
    {
      name: 'cancel_appointment',
      description: 'Use this only when the patient clearly wants to cancel the appointment entirely.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for cancellation.'
          }
        },
        required: ['reason']
      }
    }
  ];
}

function buildSystemPrompt({ patientName, doctorName, specialty, hospitalName, appointmentDateLabel, slotTime }) {
  return [
    'You are MediFlow’s automated appointment confirmation assistant.',
    `You are calling ${patientName} regarding an appointment with Dr. ${doctorName} (${specialty}) at ${hospitalName}.`,
    `The appointment is on ${appointmentDateLabel} at ${slotTime}.`,
    'Your job is only to confirm attendance, capture a reschedule request, or capture a cancellation.',
    'Be concise, polite, and explicit.',
    'If the patient confirms attendance, call confirm_appointment.',
    'If the patient asks to reschedule, collect a new date in YYYY-MM-DD and time in HH:mm, then call request_reschedule.',
    'If the patient wants to cancel, call cancel_appointment.',
    'Do not provide medical advice.',
    'If the patient is unsure or asks for a human, say the hospital team will follow up and end without calling any tool.'
  ].join(' ');
}

function buildTransientAssistant(callContext) {
  const webhookBaseUrl = getWebhookBaseUrl();
  if (!webhookBaseUrl) {
    throw new AppError('APP_BASE_URL or SERVER_PUBLIC_URL is required for Vapi webhooks', 500);
  }

  return {
    firstMessage: `Hello ${callContext.patientName}, this is MediFlow calling to confirm your appointment with Dr. ${callContext.doctorName} today at ${callContext.slotTime}. Will you be able to attend?`,
    firstMessageMode: 'assistant-speaks-first',
    serverUrl: `${webhookBaseUrl}/api/ai-calls/webhook/vapi`,
    serverMessages: ['tool-calls', 'status-update', 'end-of-call-report'],
    model: {
      provider: 'openai',
      model: process.env.VAPI_MODEL_NAME || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(callContext)
        }
      ],
      functions: buildToolDefinitions()
    }
  };
}

function buildAssistantPayload(callContext) {
  if (VAPI_ASSISTANT_ID) {
    return { assistantId: VAPI_ASSISTANT_ID };
  }

  return { assistant: buildTransientAssistant(callContext) };
}

function singleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function createOutboundCall(callLog, appointment, patient, doctor, hospital) {
  if (!isConfigured()) {
    throw new AppError('Vapi calling is not configured', 500);
  }

  const customerNumber = normalizePhoneNumber(patient.phone);
  if (!customerNumber) {
    throw new AppError('Patient phone number is invalid for automated call', 400);
  }

  const doctorName = doctor.userId?.name || 'Doctor';
  const appointmentAt = combineDateAndSlot(appointment.date, appointment.slotTime);
  const appointmentDateLabel = appointmentAt.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const callContext = {
    patientName: patient.name || 'Patient',
    doctorName,
    specialty: doctor.specialty || 'General Medicine',
    hospitalName: hospital.name || 'MediFlow Hospital',
    appointmentDateLabel,
    slotTime: appointment.slotTime
  };

  const payload = {
    phoneNumberId: VAPI_PHONE_NUMBER_ID,
    customer: {
      number: customerNumber,
      name: patient.name
    },
    ...buildAssistantPayload(callContext)
  };

  const response = await axios.post(`${VAPI_BASE_URL}/call`, payload, {
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  const providerCallId = response.data?.id || response.data?.call?.id;
  if (!providerCallId) {
    throw new AppError('Vapi did not return a call id', 502);
  }

  callLog.providerCallId = providerCallId;
  callLog.status = 'initiated';
  callLog.initiatedAt = new Date();
  callLog.phoneNumberId = VAPI_PHONE_NUMBER_ID;
  callLog.customerNumber = customerNumber;
  if (response.data?.assistantId || VAPI_ASSISTANT_ID) {
    callLog.assistantId = response.data?.assistantId || VAPI_ASSISTANT_ID;
  }
  callLog.webhookEvents.push({
    type: 'call-created',
    payload: response.data
  });
  await callLog.save();

  appointment.attendanceConfirmation = {
    ...appointment.attendanceConfirmation,
    status: 'call_in_progress',
    callAttemptCount: callLog.attemptNumber,
    lastCallAttemptAt: callLog.initiatedAt,
    lastCallLogId: callLog._id,
    lastOutcome: 'call_started',
    lastActionSource: 'ai_call'
  };
  await appointment.save();

  return callLog;
}

async function createAndDispatchCallForAppointment(appointment, triggerSource = 'scheduler') {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const hospital = appointment.hospitalId;

  if (!patient?.phone) {
    throw new AppError('Patient phone number missing', 400);
  }

  const attemptNumber = await AICallLog.countDocuments({
    appointmentId: appointment._id,
    type: 'pre_appointment_confirmation'
  }) + 1;

  if (attemptNumber > AI_CALL_MAX_ATTEMPTS) {
    throw new AppError('Maximum AI call attempts reached for this appointment', 400);
  }

  const scheduledFor = new Date();
  const callLog = await AICallLog.create({
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    hospitalId: hospital._id,
    type: 'pre_appointment_confirmation',
    triggerSource,
    status: 'queued',
    outcome: 'pending',
    scheduledFor,
    attemptNumber,
    metadata: {
      patientName: patient.name,
      doctorName: doctor.userId?.name,
      hospitalName: hospital.name,
      appointmentDate: appointment.date,
      slotTime: appointment.slotTime
    }
  });

  appointment.attendanceConfirmation = {
    ...appointment.attendanceConfirmation,
    status: 'call_scheduled',
    callAttemptCount: attemptNumber,
    lastCallAttemptAt: scheduledFor,
    lastCallLogId: callLog._id,
    lastOutcome: 'call_queued',
    lastActionSource: 'ai_call'
  };
  await appointment.save();

  try {
    await createOutboundCall(callLog, appointment, patient, doctor, hospital);
  } catch (error) {
    callLog.status = 'failed';
    callLog.outcome = 'failed';
    callLog.errorMessage = error.message;
    callLog.completedAt = new Date();
    await callLog.save();

    appointment.attendanceConfirmation = {
      ...appointment.attendanceConfirmation,
      status: 'failed',
      callAttemptCount: attemptNumber,
      lastCallAttemptAt: new Date(),
      lastCallLogId: callLog._id,
      lastOutcome: 'failed',
      lastActionSource: 'ai_call'
    };
    await appointment.save();
    throw error;
  }

  return callLog;
}

async function getAppointmentForReminder(appointmentId) {
  return Appointment.findById(appointmentId)
    .populate('patientId', 'name phone notificationPreferences')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospitalId', 'name');
}

async function triggerReminderCallForAppointment(appointmentId, options = {}) {
  if (!isConfigured()) {
    throw new AppError('Vapi calling is not configured', 500);
  }

  const appointment = await getAppointmentForReminder(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (!['booked', 'confirmed'].includes(appointment.status)) {
    throw new AppError(`Cannot trigger reminder call for appointment status: ${appointment.status}`, 400);
  }

  if (appointment.attendanceConfirmation?.automatedCallEnabled === false) {
    throw new AppError('Automated call is disabled for this appointment', 400);
  }

  const activeCall = await AICallLog.findOne({
    appointmentId: appointment._id,
    status: { $in: ['queued', 'initiated', 'in_progress'] }
  });

  if (activeCall) {
    throw new AppError('A reminder call is already active for this appointment', 409);
  }

  return createAndDispatchCallForAppointment(
    appointment,
    options.triggerSource || 'manual_retry'
  );
}

async function findAppointmentsDueForReminder(now = new Date()) {
  const windowStart = new Date(now.getTime() + (AI_CALL_LOOKAHEAD_MINUTES - AI_CALL_WINDOW_MINUTES) * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (AI_CALL_LOOKAHEAD_MINUTES + AI_CALL_WINDOW_MINUTES) * 60 * 1000);

  const startDay = new Date(windowStart);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(windowEnd);
  endDay.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    date: { $gte: startDay, $lte: endDay },
    status: { $in: ['booked', 'confirmed'] },
    'attendanceConfirmation.automatedCallEnabled': { $ne: false }
  })
    .populate('patientId', 'name phone notificationPreferences')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospitalId', 'name');

  const dueAppointments = [];

  for (const appointment of appointments) {
    const appointmentAt = combineDateAndSlot(appointment.date, appointment.slotTime);
    if (appointmentAt < windowStart || appointmentAt > windowEnd) {
      continue;
    }

    if (appointment.attendanceConfirmation?.status === 'confirmed' || appointment.attendanceConfirmation?.status === 'cancelled') {
      continue;
    }

    const priorAttempts = await AICallLog.countDocuments({
      appointmentId: appointment._id,
      type: 'pre_appointment_confirmation'
    });

    if (priorAttempts >= AI_CALL_MAX_ATTEMPTS) {
      continue;
    }

    const activeCall = await AICallLog.findOne({
      appointmentId: appointment._id,
      status: { $in: ['queued', 'initiated', 'in_progress'] }
    });

    if (activeCall) {
      continue;
    }

    dueAppointments.push(appointment);
  }

  return dueAppointments;
}

async function processDueReminderCalls(now = new Date()) {
  if (!isConfigured()) {
    return {
      success: false,
      skipped: true,
      reason: 'Vapi calling is not configured',
      processed: 0
    };
  }

  const dueAppointments = await findAppointmentsDueForReminder(now);
  let processed = 0;
  const errors = [];

  for (const appointment of dueAppointments) {
    try {
      await createAndDispatchCallForAppointment(appointment, 'scheduler');
      processed += 1;
    } catch (error) {
      errors.push({
        appointmentId: appointment._id.toString(),
        message: error.message
      });
      console.error('Failed to process reminder call:', error.message);
    }
  }

  return {
    success: true,
    processed,
    errors
  };
}

async function processRetryReminderCalls(now = new Date()) {
  if (!isConfigured()) {
    return {
      success: false,
      skipped: true,
      reason: 'Vapi calling is not configured',
      processed: 0
    };
  }

  const appointments = await Appointment.find({
    status: { $in: ['booked', 'confirmed'] },
    'attendanceConfirmation.automatedCallEnabled': { $ne: false },
    'attendanceConfirmation.status': { $in: ['unreachable', 'failed'] }
  })
    .populate('patientId', 'name phone notificationPreferences')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospitalId', 'name');

  let processed = 0;
  const errors = [];

  for (const appointment of appointments) {
    try {
      const appointmentAt = combineDateAndSlot(appointment.date, appointment.slotTime);
      if (appointmentAt <= now) {
        continue;
      }

      const attemptCount = appointment.attendanceConfirmation?.callAttemptCount || 0;
      if (attemptCount >= AI_CALL_MAX_ATTEMPTS) {
        continue;
      }

      const lastAttemptAt = appointment.attendanceConfirmation?.lastCallAttemptAt;
      if (!lastAttemptAt) {
        continue;
      }

      const minutesSinceLastAttempt = (now - new Date(lastAttemptAt)) / (1000 * 60);
      if (minutesSinceLastAttempt < AI_CALL_RETRY_MINUTES) {
        continue;
      }

      const activeCall = await AICallLog.findOne({
        appointmentId: appointment._id,
        status: { $in: ['queued', 'initiated', 'in_progress'] }
      });
      if (activeCall) {
        continue;
      }

      await createAndDispatchCallForAppointment(appointment, 'manual_retry');
      processed += 1;
    } catch (error) {
      errors.push({
        appointmentId: appointment._id.toString(),
        message: error.message
      });
      console.error('Failed to process retry reminder call:', error.message);
    }
  }

  return {
    success: true,
    processed,
    errors
  };
}

function getMessagePayload(req) {
  return req.body?.message || req.body || {};
}

function verifyWebhookSignature(req) {
  if (!VAPI_WEBHOOK_SECRET) {
    return true;
  }

  const authHeader = req.headers.authorization;
  const secretHeader = req.headers['x-vapi-secret'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  return bearerToken === VAPI_WEBHOOK_SECRET || secretHeader === VAPI_WEBHOOK_SECRET;
}

async function getCallLogByProviderCallId(providerCallId) {
  if (!providerCallId) {
    return null;
  }

  return AICallLog.findOne({ providerCallId }).sort({ createdAt: -1 });
}

function extractProviderCallId(message) {
  return (
    message?.call?.id ||
    message?.callId ||
    message?.artifact?.call?.id ||
    null
  );
}

async function handleToolCall(toolCall, callLog) {
  const appointmentId = callLog.appointmentId;
  const args = toolCall?.parameters || {};
  const baseContext = {
    callLogId: callLog._id,
    callAt: new Date(),
    patientName: callLog.metadata?.patientName
  };

  switch (toolCall.name) {
    case 'confirm_appointment':
      await markAppointmentConfirmed(appointmentId, baseContext);
      callLog.outcome = 'confirmed';
      return 'Appointment confirmed successfully.';
    case 'request_reschedule':
      await createRescheduleRequestFromAICall(appointmentId, args, baseContext);
      callLog.outcome = 'reschedule_requested';
      return 'Reschedule request recorded and shared with the hospital team.';
    case 'cancel_appointment':
      await cancelAppointmentFromAICall(appointmentId, args.reason, baseContext);
      callLog.outcome = 'cancelled';
      return 'Appointment cancelled successfully.';
    default:
      throw new AppError(`Unsupported tool call: ${toolCall.name}`, 400);
  }
}

async function processToolCallsWebhook(message) {
  const providerCallId = extractProviderCallId(message);
  const callLog = await getCallLogByProviderCallId(providerCallId);
  const toolCallList = message.toolCallList || message.toolWithToolCallList || [];

  if (!callLog) {
    return {
      results: toolCallList.map((toolCall) => ({
        toolCallId: toolCall.toolCall?.id || toolCall.id,
        error: 'Call log not found for this Vapi call.'
      }))
    };
  }

  const results = [];

  for (const entry of toolCallList) {
    const toolCall = entry.toolCall
      ? {
          id: entry.toolCall.id,
          name: entry.name,
          parameters: entry.toolCall.parameters
        }
      : entry;

    try {
      const result = await handleToolCall(toolCall, callLog);
      const normalizedResult = singleLine(result);
      callLog.toolExecutions.push({
        name: toolCall.name,
        toolCallId: toolCall.id,
        arguments: toolCall.parameters,
        result: normalizedResult
      });
      results.push({
        name: toolCall.name,
        toolCallId: toolCall.id,
        result: normalizedResult
      });
    } catch (error) {
      const errorMessage = singleLine(error.message || 'Tool execution failed.');
      callLog.toolExecutions.push({
        name: toolCall.name,
        toolCallId: toolCall.id,
        arguments: toolCall.parameters,
        error: errorMessage
      });
      results.push({
        name: toolCall.name,
        toolCallId: toolCall.id,
        error: errorMessage
      });
    }
  }

  callLog.webhookEvents.push({
    type: 'tool-calls',
    payload: message
  });
  await callLog.save();

  return { results };
}

async function processInformationalWebhook(message) {
  const providerCallId = extractProviderCallId(message);
  const callLog = await getCallLogByProviderCallId(providerCallId);

  if (!callLog) {
    return { success: false, message: 'Call log not found' };
  }

  callLog.webhookEvents.push({
    type: message.type,
    payload: message
  });

  if (message.type === 'status-update') {
    const status = message.status || message.call?.status;
    if (status) {
      callLog.status = ['queued', 'ringing', 'in-progress'].includes(status)
        ? 'in_progress'
        : callLog.status;
    }
  }

  if (message.type === 'end-of-call-report') {
    const endedAt = new Date();
    const endReason = message.endedReason || message.endReason || message.call?.endedReason || 'completed';
    const transcript = message.artifact?.transcript || message.artifact?.messages?.map((item) => item?.message).filter(Boolean).join(' ');
    const recordingUrl = message.artifact?.recordingUrl || message.artifact?.stereoRecordingUrl || null;

    callLog.status = ['assistant-ended-call', 'customer-ended-call', 'silence-timed-out'].includes(endReason)
      ? 'completed'
      : (endReason === 'no-answer' ? 'no_answer' : 'failed');
    callLog.completedAt = endedAt;
    callLog.endReason = endReason;
    if (transcript) {
      callLog.transcript = transcript;
    }
    if (recordingUrl) {
      callLog.recordingUrl = recordingUrl;
    }

    if (callLog.outcome === 'pending') {
      callLog.outcome = callLog.status === 'completed' ? 'no_response' : 'failed';

      const appointment = await Appointment.findById(callLog.appointmentId);
      if (appointment) {
        appointment.attendanceConfirmation = {
          ...appointment.attendanceConfirmation,
          status: callLog.status === 'completed' ? 'unreachable' : 'failed',
          callAttemptCount: callLog.attemptNumber,
          lastCallAttemptAt: endedAt,
          lastCallLogId: callLog._id,
          lastOutcome: callLog.outcome,
          lastActionSource: 'ai_call'
        };
        await appointment.save();
      }
    }
  }

  await callLog.save();
  return { success: true };
}

module.exports = {
  isConfigured,
  verifyWebhookSignature,
  getMessagePayload,
  processDueReminderCalls,
  processRetryReminderCalls,
  triggerReminderCallForAppointment,
  processToolCallsWebhook,
  processInformationalWebhook
};

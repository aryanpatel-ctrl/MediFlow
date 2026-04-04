const mongoose = require('mongoose');

const aiCallLogSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  type: {
    type: String,
    enum: ['pre_appointment_confirmation'],
    default: 'pre_appointment_confirmation'
  },
  provider: {
    type: String,
    enum: ['vapi'],
    default: 'vapi'
  },
  triggerSource: {
    type: String,
    enum: ['scheduler', 'manual_retry', 'admin'],
    default: 'scheduler'
  },
  status: {
    type: String,
    enum: [
      'queued',
      'initiated',
      'in_progress',
      'completed',
      'failed',
      'no_answer',
      'busy',
      'cancelled'
    ],
    default: 'queued'
  },
  outcome: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'reschedule_requested',
      'cancelled',
      'no_response',
      'voicemail',
      'failed'
    ],
    default: 'pending'
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  initiatedAt: Date,
  completedAt: Date,
  attemptNumber: {
    type: Number,
    default: 1
  },
  providerCallId: {
    type: String,
    index: true,
    sparse: true
  },
  assistantId: String,
  phoneNumberId: String,
  customerNumber: String,
  transcript: String,
  recordingUrl: String,
  endReason: String,
  assistantMessages: [String],
  errorMessage: String,
  webhookEvents: [{
    eventType: {
      type: String
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    payload: mongoose.Schema.Types.Mixed
  }],
  toolExecutions: [{
    name: String,
    toolCallId: String,
    arguments: mongoose.Schema.Types.Mixed,
    result: String,
    error: String,
    executedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

aiCallLogSchema.index({ appointmentId: 1, type: 1, attemptNumber: -1 });
aiCallLogSchema.index({ status: 1, scheduledFor: 1 });

module.exports = mongoose.model('AICallLog', aiCallLogSchema);

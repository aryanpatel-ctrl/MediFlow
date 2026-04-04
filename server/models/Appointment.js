const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // References
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
  // Timing
  date: {
    type: Date,
    required: true
  },
  slotTime: {
    type: String, // "09:00"
    required: true
  },
  slotEndTime: String, // "09:15"
  appointmentType: {
    type: String,
    trim: true
  },
  // Status
  status: {
    type: String,
    enum: ['booked', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'booked'
  },
  // Booking source
  bookingSource: {
    type: String,
    enum: ['web_chat', 'voice_call', 'manual', 'walk_in', 'reschedule'],
    default: 'web_chat'
  },
  // AI Triage Data (from chatbot)
  triageData: {
    symptoms: [String],
    symptomDuration: String,
    urgencyScore: {
      type: Number,
      min: 1,
      max: 5
    },
    reasoning: String,
    preVisitSummary: String,
    redFlags: [String],
    languageDetected: String
  },
  // Queue Position
  queueNumber: Number,
  queuePosition: Number, // Current position in queue
  estimatedWaitTime: Number, // minutes
  // Timestamps for tracking
  checkInTime: Date,
  consultationStartTime: Date,
  consultationEndTime: Date,
  actualWaitTime: Number, // minutes (calculated after consultation)
  actualConsultationDuration: Number, // minutes
  // ML Predictions
  predictedNoShowProbability: {
    type: Number,
    min: 0,
    max: 1
  },
  predictedDuration: Number, // minutes
  // Reschedule tracking
  isRescheduled: {
    type: Boolean,
    default: false
  },
  originalAppointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduleCount: {
    type: Number,
    default: 0
  },
  rescheduleReason: String,
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['patient', 'doctor', 'hospital', 'system']
  },
  // Chat session reference
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession'
  },
  // Doctor's notes (post consultation)
  doctorNotes: {
    diagnosis: String,
    prescription: String,
    followUpRequired: Boolean,
    followUpDate: Date,
    referral: {
      required: Boolean,
      specialty: String,
      notes: String
    }
  },
  // Reminders
  remindersSent: [{
    type: { type: String, enum: ['email', 'sms', 'push'] },
    sentAt: Date,
    status: String
  }],
  // Payment (if applicable)
  payment: {
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  // Feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
  // Google Calendar Integration
  googleCalendarEventId: String
}, {
  timestamps: true
});

// Compound indexes for common queries
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ hospitalId: 1, date: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1, 'triageData.urgencyScore': -1 });

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Method to calculate actual wait time
appointmentSchema.methods.calculateWaitTime = function() {
  if (this.checkInTime && this.consultationStartTime) {
    const diff = this.consultationStartTime - this.checkInTime;
    return Math.round(diff / (1000 * 60)); // minutes
  }
  return null;
};

// Method to calculate consultation duration
appointmentSchema.methods.calculateDuration = function() {
  if (this.consultationStartTime && this.consultationEndTime) {
    const diff = this.consultationEndTime - this.consultationStartTime;
    return Math.round(diff / (1000 * 60)); // minutes
  }
  return null;
};

module.exports = mongoose.model('Appointment', appointmentSchema);

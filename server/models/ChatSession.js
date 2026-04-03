const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // For function calls
  functionCall: {
    name: String,
    arguments: mongoose.Schema.Types.Mixed
  },
  // Token usage for this message
  tokenUsage: {
    prompt: Number,
    completion: Number
  }
});

const chatSessionSchema = new mongoose.Schema({
  // User reference (null for guest sessions)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For guest users
  guestInfo: {
    name: String,
    phone: String,
    email: String
  },
  // Session type
  sessionType: {
    type: String,
    enum: ['web_chat', 'voice_call'],
    default: 'web_chat'
  },
  // Conversation messages
  messages: [messageSchema],
  // Extracted triage result
  triageResult: {
    symptoms: [String],
    symptomDuration: String,
    urgencyScore: Number,
    specialist: String,
    reasoning: String,
    preVisitSummary: String,
    redFlags: [String],
    languageDetected: String
  },
  // Final recommendation
  recommendedSpecialty: String,
  recommendedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  recommendedHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  // Resulting appointment (if booked)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  // Session status
  status: {
    type: String,
    enum: ['active', 'triage_complete', 'booking_complete', 'abandoned', 'error'],
    default: 'active'
  },
  // For voice calls
  voiceCallData: {
    callId: String,
    callerPhone: String,
    duration: Number, // seconds
    recordingUrl: String
  },
  // Patient context (fetched at start)
  patientContext: {
    name: String,
    age: Number,
    gender: String,
    medicalHistory: [String],
    allergies: [String],
    totalAppointments: Number,
    noShowCount: Number
  },
  // Patient history (for returning patients)
  patientHistory: {
    totalVisits: Number,
    lastVisit: {
      date: Date,
      symptoms: [String],
      specialty: String,
      doctor: String
    },
    frequentSpecialties: [String],
    recentSymptoms: [String]
  },
  // Analytics
  totalMessages: {
    type: Number,
    default: 0
  },
  totalTokensUsed: {
    type: Number,
    default: 0
  },
  sessionDuration: Number, // seconds
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true
});

// Index for finding active sessions
chatSessionSchema.index({ userId: 1, status: 1 });
chatSessionSchema.index({ 'voiceCallData.callerPhone': 1 });

// Method to add a message
chatSessionSchema.methods.addMessage = function(role, content, functionCall = null) {
  this.messages.push({
    role,
    content,
    functionCall,
    timestamp: new Date()
  });
  this.totalMessages = this.messages.length;
};

// Method to get conversation for OpenAI
chatSessionSchema.methods.getConversationHistory = function() {
  return this.messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
};

// Method to calculate session duration
chatSessionSchema.methods.calculateDuration = function() {
  if (this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000);
  }
  return Math.round((new Date() - this.startedAt) / 1000);
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);

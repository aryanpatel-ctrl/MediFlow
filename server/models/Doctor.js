const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  // Professional info
  specialty: {
    type: String,
    required: true,
    enum: [
      'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
      'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology',
      'Gastroenterology', 'Pulmonology', 'Psychiatry', 'Urology',
      'Nephrology', 'Oncology', 'Emergency', 'Dental'
    ]
  },
  qualification: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true
  },
  licenseExpiry: Date,
  experience: {
    type: Number, // years
    required: true
  },
  bio: String,
  profilePhoto: String,
  certifications: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: String,
    resourceType: String,
  }],
  // Consultation settings
  consultationFee: {
    type: Number,
    required: true
  },
  slotDuration: {
    type: Number,
    default: 15 // minutes
  },
  maxPatientsPerDay: {
    type: Number,
    default: 40
  },
  // Weekly availability schedule
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: true },
      slots: [{
        startTime: String, // "09:00"
        endTime: String,   // "13:00"
      }]
    },
    tuesday: {
      isAvailable: { type: Boolean, default: true },
      slots: [{ startTime: String, endTime: String }]
    },
    wednesday: {
      isAvailable: { type: Boolean, default: true },
      slots: [{ startTime: String, endTime: String }]
    },
    thursday: {
      isAvailable: { type: Boolean, default: true },
      slots: [{ startTime: String, endTime: String }]
    },
    friday: {
      isAvailable: { type: Boolean, default: true },
      slots: [{ startTime: String, endTime: String }]
    },
    saturday: {
      isAvailable: { type: Boolean, default: true },
      slots: [{ startTime: String, endTime: String }]
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      slots: [{ startTime: String, endTime: String }]
    }
  },
  // Blocked dates (holidays, leaves)
  blockedDates: [{
    date: Date,
    reason: String
  }],
  // Languages spoken
  languages: [{
    type: String,
    default: ['English', 'Hindi']
  }],
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isAcceptingPatients: {
    type: Boolean,
    default: true
  },
  // Current queue status (for today)
  currentQueueStatus: {
    type: String,
    enum: ['not_started', 'active', 'paused', 'closed'],
    default: 'not_started'
  },
  currentPatientIndex: {
    type: Number,
    default: 0
  },
  avgConsultationTime: {
    type: Number,
    default: 15 // minutes, updated based on actual consultations
  },
  // Stats
  totalPatients: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound index for hospital + specialty queries
doctorSchema.index({ hospitalId: 1, specialty: 1 });

// Method to check if doctor is available on a specific date
doctorSchema.methods.isAvailableOn = function(date) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });

  // Check if blocked
  const isBlocked = this.blockedDates.some(
    blocked => blocked.date.toDateString() === date.toDateString()
  );
  if (isBlocked) return false;

  // Check weekly schedule
  return this.availability[dayOfWeek]?.isAvailable || false;
};

// Method to get slots for a specific day
doctorSchema.methods.getSlotsForDay = function(dayOfWeek) {
  const daySchedule = this.availability[dayOfWeek.toLowerCase()];
  if (!daySchedule || !daySchedule.isAvailable) return [];
  return daySchedule.slots || [];
};

module.exports = mongoose.model('Doctor', doctorSchema);

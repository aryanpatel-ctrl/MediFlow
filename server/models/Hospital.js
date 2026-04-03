const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption helpers for storing Google tokens securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  type: {
    type: String,
    enum: ['government', 'private', 'clinic', 'nursing_home'],
    default: 'private'
  },
  registrationNumber: {
    type: String,
    required: [true, 'Hospital registration number is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  website: String,
  address: {
    street: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Admin user reference
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Google Calendar Integration
  googleCalendar: {
    connected: { type: Boolean, default: false },
    accessToken: String,  // Encrypted
    refreshToken: String, // Encrypted
    tokenExpiry: Date,
    calendarId: String,   // The calendar to use for appointments
    connectedAt: Date,
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  // Available specialties in this hospital
  specialties: [{
    type: String,
    enum: [
      'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
      'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology',
      'Gastroenterology', 'Pulmonology', 'Psychiatry', 'Urology',
      'Nephrology', 'Oncology', 'Emergency', 'Dental'
    ]
  }],
  // Operating hours
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  // Default slot settings
  defaultSlotDuration: {
    type: Number,
    default: 15 // minutes
  },
  maxPatientsPerSlot: {
    type: Number,
    default: 1
  },
  // Queue settings
  queueSettings: {
    showEstimatedWait: { type: Boolean, default: true },
    allowWalkIns: { type: Boolean, default: true },
    walkInBuffer: { type: Number, default: 2 }, // extra slots reserved for walk-ins
    checkInWindowBefore: { type: Number, default: 30 }, // minutes before appointment
    checkInWindowAfter: { type: Number, default: 15 }, // minutes after appointment
    autoNoShowAfter: { type: Number, default: 30 } // minutes after which mark as no-show
  },
  // Feature flags
  features: {
    aiChatbotEnabled: { type: Boolean, default: true },
    voiceBookingEnabled: { type: Boolean, default: false },
    smsNotificationsEnabled: { type: Boolean, default: true },
    emailNotificationsEnabled: { type: Boolean, default: true },
    googleCalendarEnabled: { type: Boolean, default: false },
    smartOverbookingEnabled: { type: Boolean, default: false },
    overbookingPercentage: { type: Number, default: 10 }
  },
  // Emergency settings
  emergency24x7: { type: Boolean, default: false },
  emergencySlotsPerDoctor: { type: Number, default: 3 },
  // Branding
  logo: String,
  primaryColor: {
    type: String,
    default: '#2563eb'
  },
  // Onboarding status
  onboardingStep: {
    type: Number,
    default: 0 // 0 = not started, 1-4 = in progress, 5 = complete
  },
  onboardingComplete: {
    type: Boolean,
    default: false
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Stats
  totalDoctors: {
    type: Number,
    default: 0
  },
  totalAppointments: {
    type: Number,
    default: 0
  },
  avgWaitTime: {
    type: Number,
    default: 0 // minutes
  }
}, {
  timestamps: true
});

// Generate slug before saving
hospitalSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Index for geo queries
hospitalSchema.index({ 'address.coordinates': '2dsphere' });

// Methods for Google Calendar token management
hospitalSchema.methods.setGoogleTokens = function(accessToken, refreshToken, expiryDate) {
  this.googleCalendar.accessToken = encrypt(accessToken);
  this.googleCalendar.refreshToken = encrypt(refreshToken);
  this.googleCalendar.tokenExpiry = expiryDate;
  this.googleCalendar.connected = true;
  this.googleCalendar.connectedAt = new Date();
  this.features.googleCalendarEnabled = true;
};

hospitalSchema.methods.getGoogleTokens = function() {
  if (!this.googleCalendar.connected) return null;
  return {
    accessToken: decrypt(this.googleCalendar.accessToken),
    refreshToken: decrypt(this.googleCalendar.refreshToken),
    tokenExpiry: this.googleCalendar.tokenExpiry,
    calendarId: this.googleCalendar.calendarId
  };
};

hospitalSchema.methods.disconnectGoogleCalendar = function() {
  this.googleCalendar.connected = false;
  this.googleCalendar.accessToken = null;
  this.googleCalendar.refreshToken = null;
  this.googleCalendar.tokenExpiry = null;
  this.googleCalendar.calendarId = null;
  this.features.googleCalendarEnabled = false;
};

hospitalSchema.methods.isGoogleTokenExpired = function() {
  if (!this.googleCalendar.tokenExpiry) return true;
  return new Date() >= new Date(this.googleCalendar.tokenExpiry);
};

module.exports = mongoose.model('Hospital', hospitalSchema);

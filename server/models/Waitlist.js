const mongoose = require('mongoose');

const waitlistEntrySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Preferred time slots
  preferredSlots: [{
    startTime: String, // "09:00"
    endTime: String    // "12:00"
  }],
  // Urgency from triage
  urgencyScore: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  // Symptoms/reason
  reason: String,
  triageData: {
    symptoms: [String],
    symptomDuration: String,
    preVisitSummary: String
  },
  // Status
  status: {
    type: String,
    enum: ['waiting', 'notified', 'accepted', 'declined', 'expired', 'booked'],
    default: 'waiting'
  },
  // Notification tracking
  notifiedAt: Date,
  notificationExpiry: Date,
  responseDeadline: Date,
  // When they joined
  joinedAt: {
    type: Date,
    default: Date.now
  },
  // Priority boost for longer waiting
  priorityBoost: {
    type: Number,
    default: 0
  },
  // Contact preferences
  contactPreference: {
    type: String,
    enum: ['sms', 'push', 'both'],
    default: 'both'
  },
  // Notes
  notes: String
});

const waitlistSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true
  },
  // Waitlist entries
  entries: [waitlistEntrySchema],
  // Settings
  maxSize: {
    type: Number,
    default: 20
  },
  // Response timeout in minutes (how long patient has to respond)
  responseTimeout: {
    type: Number,
    default: 10
  },
  // Auto-notify next if no response
  autoNotifyNext: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index
waitlistSchema.index({ doctorId: 1, date: 1 }, { unique: true });
waitlistSchema.index({ hospitalId: 1, date: 1 });

// Method to add patient to waitlist
waitlistSchema.methods.addPatient = function(patientId, options = {}) {
  // Check if already in waitlist
  const existing = this.entries.find(
    e => e.patientId.toString() === patientId.toString() &&
         ['waiting', 'notified'].includes(e.status)
  );

  if (existing) {
    throw new Error('Patient already in waitlist');
  }

  // Check max size
  const activeEntries = this.entries.filter(e => ['waiting', 'notified'].includes(e.status));
  if (activeEntries.length >= this.maxSize) {
    throw new Error('Waitlist is full');
  }

  this.entries.push({
    patientId,
    preferredSlots: options.preferredSlots || [],
    urgencyScore: options.urgencyScore || 3,
    reason: options.reason,
    triageData: options.triageData,
    contactPreference: options.contactPreference || 'both',
    joinedAt: new Date()
  });

  return this.entries[this.entries.length - 1];
};

// Method to get next patient to notify
waitlistSchema.methods.getNextCandidate = function(slotTime = null) {
  const waitingEntries = this.entries.filter(e => e.status === 'waiting');

  if (waitingEntries.length === 0) return null;

  // Sort by priority: urgency + priority boost + time waiting
  waitingEntries.sort((a, b) => {
    // Calculate effective priority
    const now = Date.now();
    const waitTimeA = (now - a.joinedAt.getTime()) / (1000 * 60 * 60); // hours
    const waitTimeB = (now - b.joinedAt.getTime()) / (1000 * 60 * 60);

    const priorityA = a.urgencyScore + a.priorityBoost + (waitTimeA * 0.5);
    const priorityB = b.urgencyScore + b.priorityBoost + (waitTimeB * 0.5);

    // If slot time provided, prefer those with matching preference
    if (slotTime) {
      const matchesA = a.preferredSlots.length === 0 ||
        a.preferredSlots.some(s => slotTime >= s.startTime && slotTime <= s.endTime);
      const matchesB = b.preferredSlots.length === 0 ||
        b.preferredSlots.some(s => slotTime >= s.startTime && slotTime <= s.endTime);

      if (matchesA && !matchesB) return -1;
      if (matchesB && !matchesA) return 1;
    }

    return priorityB - priorityA;
  });

  return waitingEntries[0];
};

// Method to notify a patient
waitlistSchema.methods.notifyPatient = function(entryId, expiryMinutes = null) {
  const entry = this.entries.id(entryId);
  if (!entry) throw new Error('Entry not found');

  const timeout = expiryMinutes || this.responseTimeout;
  const now = new Date();

  entry.status = 'notified';
  entry.notifiedAt = now;
  entry.notificationExpiry = new Date(now.getTime() + timeout * 60 * 1000);
  entry.responseDeadline = entry.notificationExpiry;

  return entry;
};

// Method to handle patient response
waitlistSchema.methods.handleResponse = function(entryId, accepted) {
  const entry = this.entries.id(entryId);
  if (!entry) throw new Error('Entry not found');

  if (entry.status !== 'notified') {
    throw new Error('Patient was not notified');
  }

  // Check if expired
  if (new Date() > entry.notificationExpiry) {
    entry.status = 'expired';
    throw new Error('Response deadline passed');
  }

  entry.status = accepted ? 'accepted' : 'declined';
  return entry;
};

// Method to expire old notifications
waitlistSchema.methods.expireOldNotifications = function() {
  const now = new Date();
  const expired = [];

  for (const entry of this.entries) {
    if (entry.status === 'notified' && entry.notificationExpiry < now) {
      entry.status = 'expired';
      // Boost priority for next time
      entry.priorityBoost += 1;
      expired.push(entry);
    }
  }

  return expired;
};

// Static method to get waitlist summary
waitlistSchema.statics.getHospitalWaitlistSummary = async function(hospitalId, date) {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  const waitlists = await this.find({
    hospitalId,
    date: targetDate
  }).populate('doctorId', 'userId specialty');

  return waitlists.map(wl => ({
    doctorId: wl.doctorId._id,
    doctorName: wl.doctorId.userId?.name,
    specialty: wl.doctorId.specialty,
    waiting: wl.entries.filter(e => e.status === 'waiting').length,
    notified: wl.entries.filter(e => e.status === 'notified').length,
    booked: wl.entries.filter(e => e.status === 'booked').length
  }));
};

module.exports = mongoose.model('Waitlist', waitlistSchema);

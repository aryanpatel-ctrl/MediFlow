const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  queueNumber: {
    type: Number,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'in_consultation', 'completed', 'skipped', 'no_show'],
    default: 'waiting'
  },
  slotTime: String,
  checkInTime: Date,
  callTime: Date, // When patient was called
  consultationStartTime: Date,
  consultationEndTime: Date,
  estimatedWaitTime: Number, // minutes
  actualWaitTime: Number, // minutes
  urgencyScore: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  // For dynamic reordering
  priorityBoost: {
    type: Number,
    default: 0
  },
  // Notes
  notes: String
});

const queueSchema = new mongoose.Schema({
  // References
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
  // Queue date
  date: {
    type: Date,
    required: true
  },
  // Queue status
  status: {
    type: String,
    enum: ['not_started', 'active', 'paused', 'closed'],
    default: 'not_started'
  },
  // Queue entries (patients)
  entries: [queueEntrySchema],
  // Current patient being served
  currentIndex: {
    type: Number,
    default: -1 // -1 means no patient currently
  },
  currentPatientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Counters
  totalPatients: {
    type: Number,
    default: 0
  },
  completedPatients: {
    type: Number,
    default: 0
  },
  noShowPatients: {
    type: Number,
    default: 0
  },
  // Timing
  startTime: Date,
  pauseTime: Date,
  endTime: Date,
  totalPauseDuration: {
    type: Number,
    default: 0 // minutes
  },
  // Delay tracking
  currentDelay: {
    type: Number,
    default: 0 // minutes
  },
  delayReason: String,
  delayAnnounced: {
    type: Boolean,
    default: false
  },
  // Stats for this queue
  avgWaitTime: {
    type: Number,
    default: 0
  },
  avgConsultationTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for finding queue
queueSchema.index({ doctorId: 1, date: 1 }, { unique: true });
queueSchema.index({ hospitalId: 1, date: 1 });

// Method to add patient to queue
queueSchema.methods.addPatient = function(appointmentId, patientId, slotTime, urgencyScore = 3) {
  const queueNumber = this.totalPatients + 1;

  this.entries.push({
    appointmentId,
    patientId,
    queueNumber,
    position: this.entries.length + 1,
    slotTime,
    urgencyScore,
    status: 'waiting'
  });

  this.totalPatients = queueNumber;
  return queueNumber;
};

// Method to get next patient
queueSchema.methods.getNextPatient = function() {
  // Find next waiting patient (considering priority)
  const waitingPatients = this.entries.filter(e => e.status === 'waiting');

  if (waitingPatients.length === 0) return null;

  // Sort by priority: urgency score + priority boost
  waitingPatients.sort((a, b) => {
    const priorityA = a.urgencyScore + a.priorityBoost;
    const priorityB = b.urgencyScore + b.priorityBoost;
    if (priorityB !== priorityA) return priorityB - priorityA;
    return a.position - b.position; // Earlier position first if same priority
  });

  return waitingPatients[0];
};

// Method to calculate estimated wait for a position
queueSchema.methods.getEstimatedWait = function(position) {
  const avgTime = this.avgConsultationTime || 15;
  const patientsAhead = this.entries.filter(e =>
    e.position < position && e.status === 'waiting'
  ).length;

  return (patientsAhead * avgTime) + this.currentDelay;
};

// Method to update all wait times
queueSchema.methods.recalculateWaitTimes = function() {
  const avgTime = this.avgConsultationTime || 15;
  let cumulativeWait = this.currentDelay;

  this.entries
    .filter(e => e.status === 'waiting')
    .sort((a, b) => a.position - b.position)
    .forEach((entry, idx) => {
      entry.estimatedWaitTime = cumulativeWait;
      cumulativeWait += avgTime;
    });
};

// Method to get queue summary
queueSchema.methods.getSummary = function() {
  const waiting = this.entries.filter(e => e.status === 'waiting').length;
  const completed = this.entries.filter(e => e.status === 'completed').length;
  const inConsultation = this.entries.filter(e => e.status === 'in_consultation').length;

  return {
    status: this.status,
    total: this.totalPatients,
    waiting,
    completed,
    inConsultation,
    noShow: this.noShowPatients,
    currentDelay: this.currentDelay,
    avgWaitTime: this.avgWaitTime
  };
};

module.exports = mongoose.model('Queue', queueSchema);

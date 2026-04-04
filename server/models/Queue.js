const mongoose = require('mongoose');

// Custom error class for queue operations
class QueueError extends Error {
  constructor(message, code = 'QUEUE_ERROR', statusCode = 400) {
    super(message);
    this.name = 'QueueError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

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
    enum: ['waiting', 'in_consultation', 'completed', 'skipped', 'no_show', 'cancelled'],
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
  // ML predictions
  noShowProbability: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  predictedDuration: {
    type: Number,
    default: null
  },
  // For dynamic reordering
  priorityBoost: {
    type: Number,
    default: 0
  },
  // Notes
  notes: String,
  // Last modified timestamp for conflict detection
  lastModified: {
    type: Date,
    default: Date.now
  }
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
  },
  // Version field for optimistic locking
  version: {
    type: Number,
    default: 0
  },
  // Idempotency tracking for last operations
  lastOperationId: String,
  lastOperationAt: Date
}, {
  timestamps: true,
  optimisticConcurrency: true // Enable Mongoose optimistic concurrency
});

// Pre-save validation hook
queueSchema.pre('save', function(next) {
  // Validate currentIndex is within bounds
  if (this.currentIndex !== -1) {
    if (this.currentIndex < 0 || this.currentIndex >= this.entries.length) {
      return next(new QueueError('Invalid currentIndex: out of bounds', 'INVALID_INDEX'));
    }

    // Validate currentIndex points to in_consultation patient
    const currentEntry = this.entries[this.currentIndex];
    if (currentEntry && currentEntry.status !== 'in_consultation') {
      // Auto-fix: if patient was completed/skipped, reset currentIndex
      if (['completed', 'no_show', 'skipped', 'cancelled'].includes(currentEntry.status)) {
        this.currentIndex = -1;
        this.currentPatientId = null;
      }
    }
  }

  // Validate no duplicate queue numbers
  const queueNumbers = this.entries.map(e => e.queueNumber);
  const uniqueNumbers = new Set(queueNumbers);
  if (uniqueNumbers.size !== queueNumbers.length) {
    return next(new QueueError('Duplicate queue numbers detected', 'DUPLICATE_QUEUE_NUMBER'));
  }

  // Validate counters
  const actualCompleted = this.entries.filter(e => e.status === 'completed').length;
  const actualNoShow = this.entries.filter(e => e.status === 'no_show').length;

  // Auto-correct counters if they drift
  if (this.completedPatients !== actualCompleted) {
    this.completedPatients = actualCompleted;
  }
  if (this.noShowPatients !== actualNoShow) {
    this.noShowPatients = actualNoShow;
  }

  // Increment version on every save
  this.version++;

  next();
});

// Pre-save hook for entry modifications
queueEntrySchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Compound index for finding queue
queueSchema.index({ doctorId: 1, date: 1 }, { unique: true });
queueSchema.index({ hospitalId: 1, date: 1 });

// Method to add patient to queue with atomic queue number assignment
queueSchema.methods.addPatient = function(appointmentId, patientId, slotTime, urgencyScore = 3) {
  // Check for duplicate appointment
  const existingEntry = this.entries.find(
    e => e.appointmentId?.toString() === appointmentId?.toString()
  );
  if (existingEntry) {
    throw new QueueError('Appointment already in queue', 'DUPLICATE_APPOINTMENT');
  }

  // Atomically calculate queue number
  const maxQueueNumber = this.entries.length > 0
    ? Math.max(...this.entries.map(e => e.queueNumber))
    : 0;
  const queueNumber = maxQueueNumber + 1;

  this.entries.push({
    appointmentId,
    patientId,
    queueNumber,
    position: this.entries.length + 1,
    slotTime,
    urgencyScore,
    status: 'waiting',
    lastModified: new Date()
  });

  this.totalPatients = queueNumber;
  return queueNumber;
};

// Method to safely update entry status with conflict detection
queueSchema.methods.updateEntryStatus = function(entryId, newStatus, additionalFields = {}) {
  const entryIndex = this.entries.findIndex(
    e => e._id?.toString() === entryId?.toString()
  );

  if (entryIndex === -1) {
    throw new QueueError('Queue entry not found', 'ENTRY_NOT_FOUND', 404);
  }

  const entry = this.entries[entryIndex];

  // Validate state transitions
  const validTransitions = {
    'waiting': ['in_consultation', 'skipped', 'no_show', 'cancelled'],
    'in_consultation': ['completed', 'skipped', 'no_show'],
    'skipped': ['waiting', 'in_consultation'], // Can be re-queued
    'completed': [], // Terminal state
    'no_show': [], // Terminal state
    'cancelled': [] // Terminal state
  };

  const allowedNextStates = validTransitions[entry.status] || [];
  if (!allowedNextStates.includes(newStatus)) {
    throw new QueueError(
      `Invalid status transition: ${entry.status} -> ${newStatus}`,
      'INVALID_STATE_TRANSITION'
    );
  }

  // Update entry
  entry.status = newStatus;
  entry.lastModified = new Date();
  Object.assign(entry, additionalFields);

  return { entryIndex, entry };
};

// Method to mark appointment as cancelled in queue
queueSchema.methods.cancelEntry = function(appointmentId, reason = 'Cancelled') {
  const entry = this.entries.find(
    e => e.appointmentId?.toString() === appointmentId?.toString()
  );

  if (!entry) {
    return null; // Appointment might not be in queue yet
  }

  if (['completed', 'no_show'].includes(entry.status)) {
    throw new QueueError('Cannot cancel completed or no-show entries', 'INVALID_CANCEL');
  }

  entry.status = 'cancelled';
  entry.notes = reason;
  entry.lastModified = new Date();

  return entry;
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

// Static method to get hospital-wide summary
queueSchema.statics.getHospitalSummary = async function(hospitalId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queues = await this.find({
    hospitalId,
    date: today
  });

  let totalPatients = 0;
  let totalWaiting = 0;
  let totalInProgress = 0;
  let totalCompleted = 0;
  let totalNoShow = 0;

  queues.forEach(queue => {
    totalPatients += queue.totalPatients;
    totalWaiting += queue.entries.filter(e => e.status === 'waiting').length;
    totalInProgress += queue.entries.filter(e => e.status === 'in_consultation').length;
    totalCompleted += queue.entries.filter(e => e.status === 'completed').length;
    totalNoShow += queue.entries.filter(e => e.status === 'no_show').length;
  });

  return {
    totalPatients,
    totalWaiting,
    totalInProgress,
    totalCompleted,
    totalNoShow,
    totalQueues: queues.length
  };
};

const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;
module.exports.QueueError = QueueError;

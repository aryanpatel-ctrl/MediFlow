const mongoose = require('mongoose');

/**
 * NotificationQueue Model
 * Ensures reliable notification delivery with retry support
 */
const notificationQueueSchema = new mongoose.Schema({
  // Who to notify
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Notification type
  type: {
    type: String,
    required: true,
    enum: [
      'your_turn',
      'queue_update',
      'appointment_reminder',
      'appointment_confirmed',
      'appointment_cancelled',
      'no_show',
      'slot_available',
      'delay_notification',
      'feedback_request',
      'prescription_ready'
    ]
  },
  // Channels to notify through
  channels: {
    type: [String],
    enum: ['push', 'sms', 'email'],
    default: ['push']
  },
  // Notification content
  payload: {
    title: String,
    body: String,
    data: mongoose.Schema.Types.Mixed
  },
  // Related entities
  relatedTo: {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    queueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue' }
  },
  // Priority (higher = more urgent)
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'partial', 'failed', 'dead_letter'],
    default: 'pending',
    index: true
  },
  // Delivery results per channel
  deliveryResults: {
    push: {
      status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: Date,
      lastError: String,
      sentAt: Date,
      messageId: String
    },
    sms: {
      status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: Date,
      lastError: String,
      sentAt: Date,
      messageId: String
    },
    email: {
      status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'] },
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: Date,
      lastError: String,
      sentAt: Date,
      messageId: String
    }
  },
  // Retry configuration
  retryConfig: {
    maxAttempts: { type: Number, default: 5 },
    currentAttempt: { type: Number, default: 0 },
    nextRetryAt: Date,
    backoffMultiplier: { type: Number, default: 2 }
  },
  // Timing
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  processedAt: Date,
  // Idempotency
  idempotencyKey: {
    type: String,
    sparse: true,
    index: true
  },
  // Context for debugging
  context: {
    createdBy: String,
    requestId: String,
    source: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
notificationQueueSchema.index({ status: 1, scheduledFor: 1, priority: -1 });
notificationQueueSchema.index({ status: 1, 'retryConfig.nextRetryAt': 1 });
notificationQueueSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Calculate next retry time with exponential backoff
notificationQueueSchema.methods.calculateNextRetry = function() {
  const baseDelays = [1000, 5000, 30000, 120000, 600000]; // 1s, 5s, 30s, 2m, 10m
  const attempt = this.retryConfig.currentAttempt;

  if (attempt >= this.retryConfig.maxAttempts) {
    return null; // No more retries
  }

  const delay = baseDelays[Math.min(attempt, baseDelays.length - 1)];
  return new Date(Date.now() + delay);
};

// Mark notification for retry
notificationQueueSchema.methods.scheduleRetry = function(error) {
  this.retryConfig.currentAttempt += 1;

  const nextRetry = this.calculateNextRetry();

  if (nextRetry) {
    this.status = 'pending';
    this.retryConfig.nextRetryAt = nextRetry;
    this.scheduledFor = nextRetry;
  } else {
    this.status = 'dead_letter';
  }

  return this;
};

// Update delivery result for a channel
notificationQueueSchema.methods.updateChannelResult = function(channel, success, details = {}) {
  if (!this.deliveryResults[channel]) {
    this.deliveryResults[channel] = {};
  }

  this.deliveryResults[channel].attemptCount =
    (this.deliveryResults[channel].attemptCount || 0) + 1;
  this.deliveryResults[channel].lastAttemptAt = new Date();

  if (success) {
    this.deliveryResults[channel].status = 'sent';
    this.deliveryResults[channel].sentAt = new Date();
    this.deliveryResults[channel].messageId = details.messageId;
  } else {
    this.deliveryResults[channel].status = 'failed';
    this.deliveryResults[channel].lastError = details.error || 'Unknown error';
  }

  return this;
};

// Calculate overall status based on channel results
notificationQueueSchema.methods.calculateOverallStatus = function() {
  const channels = this.channels;
  let sentCount = 0;
  let failedCount = 0;

  for (const channel of channels) {
    const result = this.deliveryResults[channel];
    if (result?.status === 'sent') sentCount++;
    if (result?.status === 'failed') failedCount++;
  }

  if (sentCount === channels.length) {
    this.status = 'sent';
    this.processedAt = new Date();
  } else if (failedCount === channels.length) {
    // All channels failed - schedule retry
    this.scheduleRetry();
  } else if (sentCount > 0) {
    this.status = 'partial';
    this.processedAt = new Date();
  }

  return this.status;
};

// Static method to get pending notifications
notificationQueueSchema.statics.getPendingNotifications = async function(limit = 100) {
  const now = new Date();

  return this.find({
    status: { $in: ['pending', 'processing'] },
    scheduledFor: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  })
    .sort({ priority: -1, scheduledFor: 1 })
    .limit(limit)
    .populate('userId', 'name email phone fcmToken notificationPreferences');
};

// Static method to get failed notifications for retry
notificationQueueSchema.statics.getRetryableNotifications = async function(limit = 50) {
  const now = new Date();

  // Use $expr for comparing two fields, or simple approach with default max of 5
  return this.find({
    status: 'pending',
    'retryConfig.nextRetryAt': { $lte: now },
    'retryConfig.currentAttempt': { $lt: 5 } // Default max attempts
  })
    .sort({ priority: -1, 'retryConfig.nextRetryAt': 1 })
    .limit(limit)
    .populate('userId', 'name email phone fcmToken notificationPreferences');
};

// Static method to get dead letter notifications
notificationQueueSchema.statics.getDeadLetterNotifications = async function(limit = 100) {
  return this.find({ status: 'dead_letter' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email phone');
};

// Static method to create notification with idempotency check
notificationQueueSchema.statics.createWithIdempotency = async function(data) {
  if (data.idempotencyKey) {
    const existing = await this.findOne({
      idempotencyKey: data.idempotencyKey,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour window
    });

    if (existing) {
      return { notification: existing, isDuplicate: true };
    }
  }

  const notification = await this.create(data);
  return { notification, isDuplicate: false };
};

// Static method to get notification stats
notificationQueueSchema.statics.getStats = async function(hospitalId = null, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const match = { createdAt: { $gte: since } };
  if (hospitalId) {
    match['relatedTo.hospitalId'] = hospitalId;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('NotificationQueue', notificationQueueSchema);

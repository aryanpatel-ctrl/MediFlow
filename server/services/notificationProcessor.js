const NotificationQueue = require('../models/NotificationQueue');
const { sendPushNotification, sendSMS, sendEmail } = require('./notificationService');

/**
 * Notification Processor Service
 * Reliable notification delivery with retry support and circuit breaker
 */

// Circuit Breaker Configuration
const circuitBreakers = {
  push: { failures: 0, lastFailure: null, isOpen: false, threshold: 5, resetTime: 60000 },
  sms: { failures: 0, lastFailure: null, isOpen: false, threshold: 3, resetTime: 120000 },
  email: { failures: 0, lastFailure: null, isOpen: false, threshold: 5, resetTime: 60000 }
};

// Processing state
let isProcessing = false;
let processingInterval = null;

/**
 * Check if circuit breaker allows request
 */
function isCircuitOpen(channel) {
  const breaker = circuitBreakers[channel];
  if (!breaker) return false;

  if (breaker.isOpen) {
    // Check if reset time has passed
    if (Date.now() - breaker.lastFailure > breaker.resetTime) {
      breaker.isOpen = false;
      breaker.failures = 0;
      console.log(`[CircuitBreaker] ${channel} circuit reset`);
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Record circuit breaker failure
 */
function recordFailure(channel) {
  const breaker = circuitBreakers[channel];
  if (!breaker) return;

  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= breaker.threshold) {
    breaker.isOpen = true;
    console.log(`[CircuitBreaker] ${channel} circuit OPENED after ${breaker.failures} failures`);
  }
}

/**
 * Record circuit breaker success
 */
function recordSuccess(channel) {
  const breaker = circuitBreakers[channel];
  if (!breaker) return;

  breaker.failures = Math.max(0, breaker.failures - 1);
}

/**
 * Send notification through a specific channel
 */
async function sendToChannel(channel, notification, user) {
  // Check circuit breaker
  if (isCircuitOpen(channel)) {
    return {
      success: false,
      error: 'Circuit breaker open - service temporarily unavailable',
      skipped: true
    };
  }

  try {
    let result;

    switch (channel) {
      case 'push':
        if (!user.fcmToken) {
          return { success: false, error: 'No FCM token', skipped: true };
        }
        if (user.notificationPreferences?.push === false) {
          return { success: false, error: 'Push disabled by user', skipped: true };
        }

        result = await sendPushNotification(user.fcmToken, {
          title: notification.payload.title,
          body: notification.payload.body,
          data: notification.payload.data
        });

        if (result.success || result.sent) {
          recordSuccess(channel);
          return { success: true, messageId: result.messageId };
        } else {
          recordFailure(channel);
          return { success: false, error: result.error || 'Push failed' };
        }

      case 'sms':
        if (!user.phone) {
          return { success: false, error: 'No phone number', skipped: true };
        }
        if (user.notificationPreferences?.sms === false) {
          return { success: false, error: 'SMS disabled by user', skipped: true };
        }

        result = await sendSMS(user.phone, notification.payload.body);

        if (result.success || result.sent) {
          recordSuccess(channel);
          return { success: true, messageId: result.messageId };
        } else {
          recordFailure(channel);
          return { success: false, error: result.error || 'SMS failed' };
        }

      case 'email':
        if (!user.email) {
          return { success: false, error: 'No email address', skipped: true };
        }
        if (user.notificationPreferences?.email === false) {
          return { success: false, error: 'Email disabled by user', skipped: true };
        }

        result = await sendEmail(
          user.email,
          notification.payload.title,
          `<p>${notification.payload.body}</p>`
        );

        if (result.success || result.sent) {
          recordSuccess(channel);
          return { success: true, messageId: result.messageId };
        } else {
          recordFailure(channel);
          return { success: false, error: result.error || 'Email failed' };
        }

      default:
        return { success: false, error: 'Unknown channel', skipped: true };
    }
  } catch (error) {
    recordFailure(channel);
    return { success: false, error: error.message };
  }
}

/**
 * Process a single notification
 */
async function processNotification(notification) {
  const user = notification.userId;

  if (!user) {
    notification.status = 'failed';
    notification.deliveryResults = {
      push: { status: 'failed', lastError: 'User not found' },
      sms: { status: 'failed', lastError: 'User not found' },
      email: { status: 'failed', lastError: 'User not found' }
    };
    await notification.save();
    return { success: false, error: 'User not found' };
  }

  // Mark as processing
  notification.status = 'processing';
  await notification.save();

  const results = {};
  let anySuccess = false;
  let anyFailure = false;

  // Process each channel
  for (const channel of notification.channels) {
    const result = await sendToChannel(channel, notification, user);
    results[channel] = result;

    notification.updateChannelResult(channel, result.success, result);

    if (result.success) {
      anySuccess = true;
    } else if (!result.skipped) {
      anyFailure = true;
    }
  }

  // Calculate overall status
  notification.calculateOverallStatus();
  await notification.save();

  return {
    success: anySuccess,
    results,
    status: notification.status
  };
}

/**
 * Process batch of pending notifications
 */
async function processPendingNotifications(batchSize = 50) {
  if (isProcessing) {
    console.log('[NotificationProcessor] Already processing, skipping');
    return { processed: 0, skipped: true };
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    const notifications = await NotificationQueue.getPendingNotifications(batchSize);

    if (notifications.length === 0) {
      return { processed: 0 };
    }

    console.log(`[NotificationProcessor] Processing ${notifications.length} notifications`);

    let successCount = 0;
    let failureCount = 0;

    for (const notification of notifications) {
      try {
        const result = await processNotification(notification);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`[NotificationProcessor] Error processing notification ${notification._id}:`, error.message);
        failureCount++;

        // Mark for retry
        notification.scheduleRetry(error.message);
        await notification.save();
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[NotificationProcessor] Batch complete: ${successCount} sent, ${failureCount} failed in ${duration}ms`);

    return {
      processed: notifications.length,
      success: successCount,
      failed: failureCount,
      duration
    };
  } finally {
    isProcessing = false;
  }
}

/**
 * Process notifications that need retry
 */
async function processRetryNotifications(batchSize = 20) {
  try {
    const notifications = await NotificationQueue.getRetryableNotifications(batchSize);

    if (notifications.length === 0) {
      return { processed: 0 };
    }

    console.log(`[NotificationProcessor] Retrying ${notifications.length} notifications`);

    let successCount = 0;
    let failureCount = 0;
    let deadLetterCount = 0;

    for (const notification of notifications) {
      try {
        const result = await processNotification(notification);

        if (result.success) {
          successCount++;
        } else if (notification.status === 'dead_letter') {
          deadLetterCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`[NotificationProcessor] Retry error for ${notification._id}:`, error.message);
        notification.scheduleRetry(error.message);
        await notification.save();
        failureCount++;
      }
    }

    return {
      processed: notifications.length,
      success: successCount,
      failed: failureCount,
      deadLetter: deadLetterCount
    };
  } catch (error) {
    console.error('[NotificationProcessor] Retry processing error:', error);
    return { processed: 0, error: error.message };
  }
}

/**
 * Queue a notification for delivery
 */
async function queueNotification(data) {
  const notification = {
    userId: data.userId,
    type: data.type,
    channels: data.channels || ['push'],
    payload: {
      title: data.title,
      body: data.body,
      data: data.data || {}
    },
    relatedTo: data.relatedTo || {},
    priority: data.priority || 5,
    scheduledFor: data.scheduledFor || new Date(),
    expiresAt: data.expiresAt,
    idempotencyKey: data.idempotencyKey,
    context: data.context || {}
  };

  const result = await NotificationQueue.createWithIdempotency(notification);

  if (result.isDuplicate) {
    console.log(`[NotificationProcessor] Duplicate notification ignored: ${data.idempotencyKey}`);
  }

  return result;
}

/**
 * Queue critical notification (your_turn, slot_available)
 * These get higher priority and multiple channels
 */
async function queueCriticalNotification(data) {
  return queueNotification({
    ...data,
    channels: ['push', 'sms'],
    priority: 10,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Expires in 15 minutes
  });
}

/**
 * Start the notification processor
 */
function startProcessor(intervalMs = 5000) {
  if (processingInterval) {
    console.log('[NotificationProcessor] Already running');
    return;
  }

  console.log(`[NotificationProcessor] Starting with ${intervalMs}ms interval`);

  // Process pending notifications
  processingInterval = setInterval(async () => {
    try {
      await processPendingNotifications();
    } catch (error) {
      console.error('[NotificationProcessor] Processing error:', error);
    }
  }, intervalMs);

  // Process retries every 30 seconds
  setInterval(async () => {
    try {
      await processRetryNotifications();
    } catch (error) {
      console.error('[NotificationProcessor] Retry error:', error);
    }
  }, 30000);
}

/**
 * Stop the notification processor
 */
function stopProcessor() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log('[NotificationProcessor] Stopped');
  }
}

/**
 * Get processor stats
 */
async function getProcessorStats(hospitalId = null) {
  const stats = await NotificationQueue.getStats(hospitalId);
  const deadLetter = await NotificationQueue.getDeadLetterNotifications(10);

  return {
    stats: stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {}),
    circuitBreakers: Object.entries(circuitBreakers).reduce((acc, [key, val]) => {
      acc[key] = {
        isOpen: val.isOpen,
        failures: val.failures,
        lastFailure: val.lastFailure
      };
      return acc;
    }, {}),
    recentDeadLetters: deadLetter.length
  };
}

/**
 * Manually retry a dead letter notification
 */
async function retryDeadLetter(notificationId) {
  const notification = await NotificationQueue.findById(notificationId)
    .populate('userId', 'name email phone fcmToken notificationPreferences');

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.status !== 'dead_letter') {
    throw new Error('Notification is not in dead letter queue');
  }

  // Reset retry config
  notification.retryConfig.currentAttempt = 0;
  notification.retryConfig.nextRetryAt = null;
  notification.status = 'pending';
  notification.scheduledFor = new Date();

  await notification.save();

  // Process immediately
  return processNotification(notification);
}

module.exports = {
  queueNotification,
  queueCriticalNotification,
  processPendingNotifications,
  processRetryNotifications,
  startProcessor,
  stopProcessor,
  getProcessorStats,
  retryDeadLetter,
  isCircuitOpen
};

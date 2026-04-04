const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Notification type
  type: {
    type: String,
    enum: [
      'appointment_booked',
      'appointment_confirmed',
      'appointment_reminder',
      'appointment_cancelled',
      'appointment_rescheduled',
      'queue_update',
      'queue_started',
      'your_turn',
      'delay_notification',
      'check_in_reminder',
      'feedback_request',
      'doctor_available',
      'system'
    ],
    required: true
  },
  // Content
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // Related entities
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  // Delivery channels
  channels: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      status: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      status: String,
      messageId: String
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      status: String
    },
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: { type: Date, default: Date.now }
    }
  },
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Action URL (for click handling)
  actionUrl: String,
  actionType: {
    type: String,
    enum: ['view_appointment', 'check_in', 'give_feedback', 'view_queue', 'none'],
    default: 'none'
  },
  // Extra data
  metadata: mongoose.Schema.Types.Mixed,
  // Expiry
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create appointment notification
notificationSchema.statics.createAppointmentNotification = async function(
  userId,
  type,
  appointmentId,
  customMessage = null
) {
  const messages = {
    appointment_booked: {
      title: 'Appointment Booked',
      message: 'Your appointment has been successfully booked.'
    },
    appointment_confirmed: {
      title: 'Appointment Confirmed',
      message: 'Your appointment has been confirmed by the doctor.'
    },
    appointment_reminder: {
      title: 'Appointment Reminder',
      message: 'You have an upcoming appointment tomorrow.'
    },
    appointment_cancelled: {
      title: 'Appointment Cancelled',
      message: 'Your appointment has been cancelled.'
    },
    appointment_rescheduled: {
      title: 'Appointment Rescheduled',
      message: 'Your appointment has been rescheduled.'
    }
  };

  const { title, message } = customMessage || messages[type] || {
    title: 'Notification',
    message: 'You have a new notification.'
  };

  return this.create({
    userId,
    type,
    title,
    message,
    appointmentId,
    actionType: 'view_appointment',
    actionUrl: `/appointments/${appointmentId}`
  });
};

// Static method to create queue notification
notificationSchema.statics.createQueueNotification = async function(
  userId,
  type,
  appointmentId,
  data = {}
) {
  const messages = {
    queue_update: {
      title: 'Queue Update',
      message: `Your position in queue: ${data.position}. Estimated wait: ${data.waitTime} minutes.`
    },
    your_turn: {
      title: 'Your Turn!',
      message: 'Please proceed to the consultation room.',
      priority: 'urgent'
    },
    delay_notification: {
      title: 'Delay Notice',
      message: `There is a ${data.delay} minute delay. We apologize for the inconvenience.`
    },
    check_in_reminder: {
      title: 'Check-in Reminder',
      message: 'Your appointment is in 30 minutes. Please check in when you arrive.'
    }
  };

  const config = messages[type] || { title: 'Queue Update', message: 'Queue status updated.' };

  return this.create({
    userId,
    type,
    title: config.title,
    message: config.message,
    appointmentId,
    priority: config.priority || 'medium',
    actionType: 'view_queue',
    metadata: data
  });
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);

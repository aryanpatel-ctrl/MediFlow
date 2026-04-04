const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const { protect, asyncHandler, AppError } = require('../middleware');

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const query = { userId: req.user.id };

  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    notifications
  });
}));

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await notification.markAsRead();

  res.status(200).json({
    success: true,
    notification
  });
}));

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', protect, asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Notification deleted'
  });
}));

// @route   DELETE /api/notifications
// @desc    Clear all notifications
// @access  Private
router.delete('/', protect, asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });

  res.status(200).json({
    success: true,
    message: 'All notifications cleared'
  });
}));

// @route   PUT /api/notifications/fcm-token
// @desc    Update FCM token for push notifications
// @access  Private
router.put('/fcm-token', protect, asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  const { User } = require('../models');
  await User.findByIdAndUpdate(req.user.id, { fcmToken });

  res.status(200).json({
    success: true,
    message: 'FCM token updated'
  });
}));

// @route   GET /api/notifications/queue/stats
// @desc    Get notification queue stats (admin only)
// @access  Private (hospital_admin, super_admin)
router.get('/queue/stats', protect, asyncHandler(async (req, res) => {
  // Only allow admins
  if (!['hospital_admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Not authorized', 403);
  }

  const notificationProcessor = require('../services/notificationProcessor');
  const hospitalId = req.user.role === 'hospital_admin' ? req.user.hospitalId : null;

  const stats = await notificationProcessor.getProcessorStats(hospitalId);

  res.status(200).json({
    success: true,
    ...stats
  });
}));

// @route   GET /api/notifications/queue/dead-letter
// @desc    Get dead letter notifications for manual review
// @access  Private (hospital_admin, super_admin)
router.get('/queue/dead-letter', protect, asyncHandler(async (req, res) => {
  if (!['hospital_admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Not authorized', 403);
  }

  const { NotificationQueue } = require('../models');
  const { limit = 50 } = req.query;

  const deadLetters = await NotificationQueue.getDeadLetterNotifications(parseInt(limit));

  res.status(200).json({
    success: true,
    count: deadLetters.length,
    notifications: deadLetters
  });
}));

// @route   POST /api/notifications/queue/retry/:id
// @desc    Manually retry a dead letter notification
// @access  Private (hospital_admin, super_admin)
router.post('/queue/retry/:id', protect, asyncHandler(async (req, res) => {
  if (!['hospital_admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Not authorized', 403);
  }

  const notificationProcessor = require('../services/notificationProcessor');

  const result = await notificationProcessor.retryDeadLetter(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Notification retry initiated',
    result
  });
}));

// @route   GET /api/notifications/queue/user/:userId
// @desc    Get notification delivery history for a user (admin only)
// @access  Private (hospital_admin, super_admin)
router.get('/queue/user/:userId', protect, asyncHandler(async (req, res) => {
  if (!['hospital_admin', 'super_admin'].includes(req.user.role)) {
    throw new AppError('Not authorized', 403);
  }

  const { NotificationQueue } = require('../models');
  const { limit = 20 } = req.query;

  const notifications = await NotificationQueue.find({ userId: req.params.userId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('type channels status deliveryResults createdAt payload.title');

  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications
  });
}));

module.exports = router;

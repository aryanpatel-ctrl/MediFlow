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

module.exports = router;

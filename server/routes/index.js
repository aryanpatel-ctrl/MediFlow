const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const hospitalRoutes = require('./hospitals');
const doctorRoutes = require('./doctors');
const appointmentRoutes = require('./appointments');
const chatRoutes = require('./chat');
const queueRoutes = require('./queue');
const notificationRoutes = require('./notifications');

// Mount routes
router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/chat', chatRoutes);
router.use('/queue', queueRoutes);
router.use('/notifications', notificationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MedQueue API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

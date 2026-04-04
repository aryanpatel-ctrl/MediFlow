require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api', routes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user-specific room
  socket.on('join:user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join queue room for real-time updates
  socket.on('join:queue', (doctorId) => {
    socket.join(`queue:${doctorId}`);
    console.log(`Socket joined queue:${doctorId}`);
  });

  // Leave queue room
  socket.on('leave:queue', (doctorId) => {
    socket.leave(`queue:${doctorId}`);
  });

  // Join hospital room (for admin dashboard)
  socket.on('join:hospital', (hospitalId) => {
    socket.join(`hospital:${hospitalId}`);
    console.log(`Socket joined hospital:${hospitalId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize schedulers for auto no-show detection
const schedulerService = require('./services/schedulerService');

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║         MediFlow Server Started               ║
╠═══════════════════════════════════════════════╣
║  Port: ${PORT}                                    ║
║  Mode: ${process.env.NODE_ENV || 'development'}                          ║
║  API:  http://localhost:${PORT}/api               ║
╚═══════════════════════════════════════════════╝
  `);

  // Start schedulers in production/development
  if (process.env.ENABLE_SCHEDULERS !== 'false') {
    schedulerService.initializeSchedulers({
      noShowIntervalMinutes: parseInt(process.env.NO_SHOW_CHECK_INTERVAL) || 5,
      highRiskIntervalMinutes: parseInt(process.env.HIGH_RISK_CHECK_INTERVAL) || 30,
      aiCallIntervalMinutes: parseInt(process.env.AI_CALL_CHECK_INTERVAL) || 1
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = { app, server, io };

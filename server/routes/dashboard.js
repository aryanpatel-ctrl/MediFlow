const express = require('express');
const router = express.Router();
const { Appointment, Doctor, Queue, Hospital, User, Notification } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');
const mlService = require('../services/mlService');
const doctorAnalytics = require('../services/doctorAnalyticsService');

// ========================================
// NO-SHOW RISK DASHBOARD APIs
// ========================================

// @route   GET /api/dashboard/no-show-risk
// @desc    Get all high-risk appointments for today/specified date
// @access  Private/Hospital Admin
router.get('/no-show-risk', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  // Get high-risk appointments using ML
  const highRiskResults = await mlService.identifyHighRiskAppointments(targetDate, 0.25);

  // Group by risk level
  const dashboard = {
    date: targetDate.toISOString().split('T')[0],
    summary: {
      total: highRiskResults.length,
      high: highRiskResults.filter(r => r.riskLevel === 'high').length,
      medium: highRiskResults.filter(r => r.riskLevel === 'medium').length
    },
    highRisk: [],
    mediumRisk: []
  };

  for (const risk of highRiskResults) {
    const apt = risk.appointment;
    if (!apt) continue;

    const riskData = {
      appointmentId: apt._id,
      patientId: apt.patientId?._id,
      patientName: apt.patientId?.name || 'Unknown',
      patientPhone: apt.patientId?.phone,
      doctorName: apt.doctorId?.userId?.name,
      slotTime: apt.slotTime,
      noShowProbability: Math.round(risk.noShowProbability * 100),
      riskLevel: risk.riskLevel,
      interventions: risk.recommendedInterventions,
      historicalNoShows: apt.patientId?.noShowCount || 0,
      totalAppointments: apt.patientId?.totalAppointments || 0
    };

    if (risk.riskLevel === 'high') {
      dashboard.highRisk.push(riskData);
    } else {
      dashboard.mediumRisk.push(riskData);
    }
  }

  // Sort by probability
  dashboard.highRisk.sort((a, b) => b.noShowProbability - a.noShowProbability);
  dashboard.mediumRisk.sort((a, b) => b.noShowProbability - a.noShowProbability);

  res.status(200).json({
    success: true,
    dashboard
  });
}));

// @route   GET /api/dashboard/no-show-risk/stats
// @desc    Get no-show statistics for the hospital
// @access  Private/Hospital Admin
router.get('/no-show-risk/stats', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const hospitalId = req.user.hospitalId;

  // Get all appointments in the date range
  const appointments = await Appointment.find({
    hospitalId,
    date: { $gte: startDate },
    status: { $in: ['completed', 'no_show'] }
  });

  const total = appointments.length;
  const noShows = appointments.filter(a => a.status === 'no_show').length;
  const noShowRate = total > 0 ? ((noShows / total) * 100).toFixed(1) : 0;

  // Group by day
  const byDay = {};
  appointments.forEach(apt => {
    const day = apt.date.toISOString().split('T')[0];
    if (!byDay[day]) {
      byDay[day] = { total: 0, noShow: 0 };
    }
    byDay[day].total++;
    if (apt.status === 'no_show') {
      byDay[day].noShow++;
    }
  });

  // Calculate daily rates
  const dailyRates = Object.entries(byDay).map(([date, data]) => ({
    date,
    total: data.total,
    noShows: data.noShow,
    rate: data.total > 0 ? ((data.noShow / data.total) * 100).toFixed(1) : 0
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Group by hour
  const byHour = {};
  appointments.filter(a => a.status === 'no_show').forEach(apt => {
    const hour = parseInt(apt.slotTime?.split(':')[0]) || 0;
    byHour[hour] = (byHour[hour] || 0) + 1;
  });

  // Find peak no-show hour
  const peakHour = Object.entries(byHour)
    .sort((a, b) => b[1] - a[1])[0];

  res.status(200).json({
    success: true,
    stats: {
      period: `Last ${days} days`,
      totalAppointments: total,
      noShows,
      noShowRate: parseFloat(noShowRate),
      dailyRates,
      byHour,
      peakNoShowHour: peakHour ? `${peakHour[0]}:00` : null,
      trend: calculateTrend(dailyRates)
    }
  });
}));

// @route   POST /api/dashboard/no-show-risk/:appointmentId/intervene
// @desc    Mark intervention taken for high-risk appointment
// @access  Private/Hospital Admin
router.post('/no-show-risk/:appointmentId/intervene', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const { intervention, notes } = req.body;

  const appointment = await Appointment.findById(req.params.appointmentId)
    .populate('patientId', 'name phone');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Log the intervention
  if (!appointment.interventions) {
    appointment.interventions = [];
  }

  appointment.interventions.push({
    type: intervention,
    notes,
    performedBy: req.user.id,
    performedAt: new Date()
  });

  await appointment.save();

  res.status(200).json({
    success: true,
    message: `Intervention '${intervention}' logged for appointment`,
    appointment: {
      id: appointment._id,
      patientName: appointment.patientId?.name,
      interventions: appointment.interventions
    }
  });
}));

// ========================================
// DOCTOR PERFORMANCE ALERTS APIs
// ========================================

// @route   GET /api/dashboard/doctor-alerts
// @desc    Get doctor performance alerts
// @access  Private/Hospital Admin
router.get('/doctor-alerts', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const hospitalId = req.user.hospitalId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all doctors in hospital
  const doctors = await Doctor.find({ hospitalId, isActive: true })
    .populate('userId', 'name');

  const alerts = [];

  for (const doctor of doctors) {
    const doctorAlerts = [];

    // Get today's queue
    const queue = await Queue.findOne({ doctorId: doctor._id, date: today });

    // Get recent appointments for trend analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAppointments = await Appointment.find({
      doctorId: doctor._id,
      date: { $gte: thirtyDaysAgo },
      status: { $in: ['completed', 'no_show'] }
    });

    // Calculate metrics
    const completed = recentAppointments.filter(a => a.status === 'completed');
    const noShows = recentAppointments.filter(a => a.status === 'no_show');

    const avgWaitTime = completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.actualWaitTime || 0), 0) / completed.length
      : 0;

    const noShowRate = recentAppointments.length > 0
      ? (noShows.length / recentAppointments.length) * 100
      : 0;

    // ALERT 1: High wait time (> 30 mins average)
    if (avgWaitTime > 30) {
      doctorAlerts.push({
        type: 'high_wait_time',
        severity: avgWaitTime > 45 ? 'critical' : 'warning',
        message: `Average wait time is ${Math.round(avgWaitTime)} minutes (target: <30 mins)`,
        metric: Math.round(avgWaitTime),
        threshold: 30,
        recommendation: 'Consider reducing appointment slots or increasing consultation efficiency'
      });
    }

    // ALERT 2: High no-show rate (> 20%)
    if (noShowRate > 20) {
      doctorAlerts.push({
        type: 'high_no_show_rate',
        severity: noShowRate > 30 ? 'critical' : 'warning',
        message: `No-show rate is ${noShowRate.toFixed(1)}% (target: <20%)`,
        metric: parseFloat(noShowRate.toFixed(1)),
        threshold: 20,
        recommendation: 'Enable automated reminders and consider overbooking'
      });
    }

    // ALERT 3: Current queue delay (> 20 mins)
    if (queue && queue.currentDelay > 20) {
      doctorAlerts.push({
        type: 'queue_delay',
        severity: queue.currentDelay > 40 ? 'critical' : 'warning',
        message: `Current queue delay is ${queue.currentDelay} minutes`,
        metric: queue.currentDelay,
        threshold: 20,
        recommendation: 'Notify waiting patients about the delay'
      });
    }

    // ALERT 4: Queue not started (after 9 AM)
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && queue && queue.status === 'not_started') {
      doctorAlerts.push({
        type: 'queue_not_started',
        severity: 'info',
        message: 'Queue has not been started yet',
        recommendation: 'Check if doctor is available or start queue'
      });
    }

    // ALERT 5: Low utilization (< 50% of max capacity)
    const todayAppointments = await Appointment.countDocuments({
      doctorId: doctor._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      status: { $nin: ['cancelled', 'rescheduled'] }
    });

    const maxCapacity = doctor.maxPatientsPerDay || 40;
    const utilization = (todayAppointments / maxCapacity) * 100;

    if (utilization < 50 && currentHour < 12) {
      doctorAlerts.push({
        type: 'low_utilization',
        severity: 'info',
        message: `Only ${utilization.toFixed(0)}% slots booked for today (${todayAppointments}/${maxCapacity})`,
        metric: parseFloat(utilization.toFixed(1)),
        threshold: 50,
        recommendation: 'Consider accepting walk-ins or promoting available slots'
      });
    }

    if (doctorAlerts.length > 0) {
      alerts.push({
        doctorId: doctor._id,
        doctorName: doctor.userId?.name || 'Unknown',
        specialty: doctor.specialty,
        alertCount: doctorAlerts.length,
        criticalCount: doctorAlerts.filter(a => a.severity === 'critical').length,
        alerts: doctorAlerts
      });
    }
  }

  // Sort by critical alerts first
  alerts.sort((a, b) => b.criticalCount - a.criticalCount);

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      totalDoctors: doctors.length,
      doctorsWithAlerts: alerts.length,
      totalAlerts: alerts.reduce((sum, d) => sum + d.alertCount, 0),
      criticalAlerts: alerts.reduce((sum, d) => sum + d.criticalCount, 0)
    },
    alerts
  });
}));

// @route   GET /api/dashboard/doctor-alerts/:doctorId
// @desc    Get specific doctor's performance details
// @access  Private/Hospital Admin or Doctor
router.get('/doctor-alerts/:doctorId', protect, asyncHandler(async (req, res) => {
  const analytics = await doctorAnalytics.getDoctorAnalytics(req.params.doctorId, 30);
  const trends = await doctorAnalytics.getEfficiencyTrends(req.params.doctorId, 6);

  res.status(200).json({
    success: true,
    analytics,
    trends
  });
}));

// @route   POST /api/dashboard/doctor-alerts/:doctorId/acknowledge
// @desc    Acknowledge an alert
// @access  Private/Hospital Admin
router.post('/doctor-alerts/:doctorId/acknowledge', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const { alertType, notes } = req.body;

  // Create notification for doctor
  const doctor = await Doctor.findById(req.params.doctorId);
  if (doctor) {
    await Notification.create({
      userId: doctor.userId,
      type: 'performance_alert',
      title: 'Performance Alert Acknowledged',
      message: `Admin has acknowledged your ${alertType.replace(/_/g, ' ')} alert. ${notes || ''}`,
      relatedId: doctor._id,
      relatedModel: 'Doctor'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Alert acknowledged and doctor notified'
  });
}));

// ========================================
// HOSPITAL OVERVIEW DASHBOARD
// ========================================

// @route   GET /api/dashboard/overview
// @desc    Get hospital dashboard overview
// @access  Private/Hospital Admin
router.get('/overview', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const hospitalId = req.user.hospitalId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Today's stats
  const [
    todayAppointments,
    todayCompleted,
    todayNoShows,
    todayCancelled,
    activeQueues,
    totalDoctors,
    waitingPatients
  ] = await Promise.all([
    Appointment.countDocuments({ hospitalId, date: { $gte: today, $lt: tomorrow } }),
    Appointment.countDocuments({ hospitalId, date: { $gte: today, $lt: tomorrow }, status: 'completed' }),
    Appointment.countDocuments({ hospitalId, date: { $gte: today, $lt: tomorrow }, status: 'no_show' }),
    Appointment.countDocuments({ hospitalId, date: { $gte: today, $lt: tomorrow }, status: 'cancelled' }),
    Queue.countDocuments({ hospitalId, date: today, status: 'active' }),
    Doctor.countDocuments({ hospitalId, isActive: true }),
    Queue.aggregate([
      { $match: { hospitalId: hospitalId, date: today } },
      { $unwind: '$entries' },
      { $match: { 'entries.status': 'waiting' } },
      { $count: 'waiting' }
    ])
  ]);

  // Calculate average wait time today
  const completedToday = await Appointment.find({
    hospitalId,
    date: { $gte: today, $lt: tomorrow },
    status: 'completed',
    actualWaitTime: { $exists: true, $gt: 0 }
  }).select('actualWaitTime');

  const avgWaitTime = completedToday.length > 0
    ? Math.round(completedToday.reduce((sum, a) => sum + a.actualWaitTime, 0) / completedToday.length)
    : 0;

  res.status(200).json({
    success: true,
    overview: {
      date: today.toISOString().split('T')[0],
      appointments: {
        total: todayAppointments,
        completed: todayCompleted,
        noShows: todayNoShows,
        cancelled: todayCancelled,
        remaining: todayAppointments - todayCompleted - todayNoShows - todayCancelled
      },
      queues: {
        active: activeQueues,
        totalDoctors,
        waitingPatients: waitingPatients[0]?.waiting || 0
      },
      performance: {
        avgWaitTime,
        completionRate: todayAppointments > 0
          ? ((todayCompleted / todayAppointments) * 100).toFixed(1)
          : 0,
        noShowRate: todayAppointments > 0
          ? ((todayNoShows / todayAppointments) * 100).toFixed(1)
          : 0
      }
    }
  });
}));

// Helper function
function calculateTrend(dailyRates) {
  if (dailyRates.length < 7) return 'insufficient_data';

  const midIndex = Math.floor(dailyRates.length / 2);
  const firstHalf = dailyRates.slice(0, midIndex);
  const secondHalf = dailyRates.slice(midIndex);

  const firstAvg = firstHalf.reduce((sum, d) => sum + parseFloat(d.rate), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + parseFloat(d.rate), 0) / secondHalf.length;

  if (secondAvg > firstAvg * 1.1) return 'increasing';
  if (secondAvg < firstAvg * 0.9) return 'decreasing';
  return 'stable';
}

module.exports = router;

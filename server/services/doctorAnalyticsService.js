const { Doctor, Appointment, Queue, User } = require('../models');

/**
 * Doctor Analytics Service
 * Provides utilization tracking, efficiency trends, and performance metrics
 */

/**
 * Get comprehensive doctor analytics
 */
async function getDoctorAnalytics(doctorId, dateRange = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const [
    appointmentStats,
    waitTimeStats,
    utilizationData,
    noShowStats,
    patientSatisfaction,
    peakHoursData
  ] = await Promise.all([
    getAppointmentStats(doctorId, startDate, endDate),
    getWaitTimeStats(doctorId, startDate, endDate),
    getUtilizationData(doctorId, startDate, endDate),
    getNoShowStats(doctorId, startDate, endDate),
    getPatientSatisfaction(doctorId, startDate, endDate),
    getPeakHoursAnalysis(doctorId, startDate, endDate)
  ]);

  const doctor = await Doctor.findById(doctorId).populate('userId', 'name');

  return {
    doctor: {
      id: doctorId,
      name: doctor?.userId?.name,
      specialty: doctor?.specialty,
      avgConsultationTime: doctor?.avgConsultationTime
    },
    dateRange: {
      start: startDate,
      end: endDate,
      days: dateRange
    },
    appointmentStats,
    waitTimeStats,
    utilizationData,
    noShowStats,
    patientSatisfaction,
    peakHoursData
  };
}

/**
 * Get appointment statistics
 */
async function getAppointmentStats(doctorId, startDate, endDate) {
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate }
  }).select('status appointmentType date');

  const total = appointments.length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const noShow = appointments.filter(a => a.status === 'no_show').length;
  const rescheduled = appointments.filter(a => a.status === 'rescheduled').length;

  // Group by day
  const byDay = {};
  appointments.forEach(apt => {
    const day = apt.date.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const avgPerDay = total / Math.max(1, Object.keys(byDay).length);

  // Group by type
  const byType = {};
  appointments.forEach(apt => {
    const type = apt.appointmentType || 'General';
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total,
    completed,
    cancelled,
    noShow,
    rescheduled,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
    avgPerDay: avgPerDay.toFixed(1),
    byDay,
    byType,
    trend: calculateTrend(byDay)
  };
}

/**
 * Get wait time statistics
 */
async function getWaitTimeStats(doctorId, startDate, endDate) {
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: 'completed',
    actualWaitTime: { $exists: true, $gt: 0 }
  }).select('actualWaitTime date');

  if (appointments.length === 0) {
    return {
      avgWaitTime: 0,
      minWaitTime: 0,
      maxWaitTime: 0,
      medianWaitTime: 0,
      trend: 'stable',
      distribution: {}
    };
  }

  const waitTimes = appointments.map(a => a.actualWaitTime);
  waitTimes.sort((a, b) => a - b);

  const avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
  const minWaitTime = waitTimes[0];
  const maxWaitTime = waitTimes[waitTimes.length - 1];
  const medianWaitTime = waitTimes[Math.floor(waitTimes.length / 2)];

  // Distribution buckets
  const distribution = {
    '0-5 mins': waitTimes.filter(t => t <= 5).length,
    '5-15 mins': waitTimes.filter(t => t > 5 && t <= 15).length,
    '15-30 mins': waitTimes.filter(t => t > 15 && t <= 30).length,
    '30-60 mins': waitTimes.filter(t => t > 30 && t <= 60).length,
    '60+ mins': waitTimes.filter(t => t > 60).length
  };

  // Calculate trend by comparing first and second half
  const midIndex = Math.floor(appointments.length / 2);
  const firstHalfAvg = waitTimes.slice(0, midIndex).reduce((a, b) => a + b, 0) / midIndex || 0;
  const secondHalfAvg = waitTimes.slice(midIndex).reduce((a, b) => a + b, 0) / (waitTimes.length - midIndex) || 0;

  let trend = 'stable';
  if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'improving';
  else if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'degrading';

  return {
    avgWaitTime: Math.round(avgWaitTime),
    minWaitTime,
    maxWaitTime,
    medianWaitTime,
    trend,
    distribution,
    totalMeasured: appointments.length
  };
}

/**
 * Get utilization data
 */
async function getUtilizationData(doctorId, startDate, endDate) {
  const doctor = await Doctor.findById(doctorId);
  const maxPatientsPerDay = doctor?.maxPatientsPerDay || 40;

  // Get daily appointment counts
  const appointments = await Appointment.aggregate([
    {
      $match: {
        doctorId: doctor._id,
        date: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'rescheduled'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Calculate utilization percentages
  const dailyUtilization = appointments.map(day => ({
    date: day._id,
    appointments: day.count,
    completed: day.completed,
    utilization: Math.min(100, (day.count / maxPatientsPerDay) * 100).toFixed(1)
  }));

  const avgUtilization = dailyUtilization.length > 0
    ? dailyUtilization.reduce((sum, d) => sum + parseFloat(d.utilization), 0) / dailyUtilization.length
    : 0;

  // Identify underutilized days (<50%)
  const underutilizedDays = dailyUtilization.filter(d => parseFloat(d.utilization) < 50);

  // Identify overloaded days (>90%)
  const overloadedDays = dailyUtilization.filter(d => parseFloat(d.utilization) > 90);

  return {
    avgUtilization: avgUtilization.toFixed(1),
    maxCapacity: maxPatientsPerDay,
    dailyUtilization,
    underutilizedDays: underutilizedDays.length,
    overloadedDays: overloadedDays.length,
    efficiencyScore: calculateEfficiencyScore(avgUtilization, underutilizedDays.length, overloadedDays.length)
  };
}

/**
 * Get no-show statistics
 */
async function getNoShowStats(doctorId, startDate, endDate) {
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ['completed', 'no_show'] }
  }).select('status date slotTime');

  const total = appointments.length;
  const noShows = appointments.filter(a => a.status === 'no_show');
  const noShowCount = noShows.length;
  const noShowRate = total > 0 ? ((noShowCount / total) * 100) : 0;

  // Analyze no-show patterns by hour
  const byHour = {};
  noShows.forEach(apt => {
    const hour = parseInt(apt.slotTime?.split(':')[0]) || 0;
    byHour[hour] = (byHour[hour] || 0) + 1;
  });

  // Analyze by day of week
  const byDayOfWeek = {};
  noShows.forEach(apt => {
    const day = apt.date.toLocaleDateString('en-US', { weekday: 'long' });
    byDayOfWeek[day] = (byDayOfWeek[day] || 0) + 1;
  });

  // Find peak no-show times
  const peakNoShowHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
  const peakNoShowDay = Object.entries(byDayOfWeek).sort((a, b) => b[1] - a[1])[0];

  return {
    total: noShowCount,
    rate: noShowRate.toFixed(1),
    byHour,
    byDayOfWeek,
    peakNoShowHour: peakNoShowHour ? `${peakNoShowHour[0]}:00` : null,
    peakNoShowDay: peakNoShowDay ? peakNoShowDay[0] : null,
    recommendations: generateNoShowRecommendations(noShowRate, byHour, byDayOfWeek)
  };
}

/**
 * Get patient satisfaction metrics
 */
async function getPatientSatisfaction(doctorId, startDate, endDate) {
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: 'completed',
    'feedback.rating': { $exists: true }
  }).select('feedback');

  if (appointments.length === 0) {
    return {
      avgRating: 0,
      totalReviews: 0,
      ratingDistribution: {},
      recentFeedback: []
    };
  }

  const ratings = appointments.map(a => a.feedback.rating);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  // Rating distribution
  const distribution = {
    5: ratings.filter(r => r === 5).length,
    4: ratings.filter(r => r === 4).length,
    3: ratings.filter(r => r === 3).length,
    2: ratings.filter(r => r === 2).length,
    1: ratings.filter(r => r === 1).length
  };

  // Get recent feedback with comments
  const recentFeedback = appointments
    .filter(a => a.feedback.comment)
    .slice(-5)
    .map(a => ({
      rating: a.feedback.rating,
      comment: a.feedback.comment
    }));

  return {
    avgRating: avgRating.toFixed(1),
    totalReviews: appointments.length,
    ratingDistribution: distribution,
    recentFeedback
  };
}

/**
 * Analyze peak hours
 */
async function getPeakHoursAnalysis(doctorId, startDate, endDate) {
  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: 'completed'
  }).select('slotTime actualConsultationDuration actualWaitTime');

  // Group by hour
  const hourlyData = {};
  for (let h = 6; h <= 22; h++) {
    hourlyData[h] = {
      count: 0,
      totalDuration: 0,
      totalWaitTime: 0
    };
  }

  appointments.forEach(apt => {
    const hour = parseInt(apt.slotTime?.split(':')[0]) || 10;
    if (hourlyData[hour]) {
      hourlyData[hour].count++;
      hourlyData[hour].totalDuration += apt.actualConsultationDuration || 0;
      hourlyData[hour].totalWaitTime += apt.actualWaitTime || 0;
    }
  });

  // Calculate averages and identify patterns
  const hourlyStats = Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    appointmentCount: data.count,
    avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
    avgWaitTime: data.count > 0 ? Math.round(data.totalWaitTime / data.count) : 0
  }));

  // Find peak hours (top 3)
  const peakHours = [...hourlyStats]
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 3)
    .map(h => h.hour);

  // Find best slots (lowest wait times)
  const bestSlots = [...hourlyStats]
    .filter(h => h.appointmentCount > 0)
    .sort((a, b) => a.avgWaitTime - b.avgWaitTime)
    .slice(0, 3)
    .map(h => h.hour);

  return {
    hourlyStats,
    peakHours,
    bestSlots,
    recommendations: generateSchedulingRecommendations(hourlyStats, peakHours)
  };
}

/**
 * Get doctor comparison within hospital
 */
async function getDoctorComparison(hospitalId, specialty = null) {
  const query = { hospitalId, isActive: true };
  if (specialty) query.specialty = specialty;

  const doctors = await Doctor.find(query).populate('userId', 'name');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const comparisons = await Promise.all(
    doctors.map(async (doctor) => {
      const appointments = await Appointment.find({
        doctorId: doctor._id,
        date: { $gte: thirtyDaysAgo },
        status: { $in: ['completed', 'no_show'] }
      }).select('status actualWaitTime actualConsultationDuration feedback');

      const completed = appointments.filter(a => a.status === 'completed');
      const noShows = appointments.filter(a => a.status === 'no_show');

      const avgWaitTime = completed.length > 0
        ? completed.reduce((sum, a) => sum + (a.actualWaitTime || 0), 0) / completed.length
        : 0;

      const avgConsultation = completed.length > 0
        ? completed.reduce((sum, a) => sum + (a.actualConsultationDuration || 0), 0) / completed.length
        : 0;

      const ratings = completed.filter(a => a.feedback?.rating).map(a => a.feedback.rating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      return {
        doctorId: doctor._id,
        name: doctor.userId?.name,
        specialty: doctor.specialty,
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        noShowRate: appointments.length > 0 ? ((noShows.length / appointments.length) * 100).toFixed(1) : 0,
        avgWaitTime: Math.round(avgWaitTime),
        avgConsultationTime: Math.round(avgConsultation),
        avgRating: avgRating.toFixed(1),
        efficiencyScore: calculateDoctorEfficiency(completed.length, avgWaitTime, noShows.length)
      };
    })
  );

  // Sort by efficiency score
  comparisons.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  return {
    doctors: comparisons,
    hospitalAverages: {
      avgWaitTime: Math.round(comparisons.reduce((sum, d) => sum + d.avgWaitTime, 0) / comparisons.length || 0),
      avgNoShowRate: (comparisons.reduce((sum, d) => sum + parseFloat(d.noShowRate), 0) / comparisons.length || 0).toFixed(1),
      avgRating: (comparisons.reduce((sum, d) => sum + parseFloat(d.avgRating), 0) / comparisons.length || 0).toFixed(1)
    }
  };
}

/**
 * Get efficiency trends over time
 */
async function getEfficiencyTrends(doctorId, months = 6) {
  const trends = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['completed', 'no_show'] }
    }).select('status actualWaitTime actualConsultationDuration');

    const completed = appointments.filter(a => a.status === 'completed');
    const noShows = appointments.filter(a => a.status === 'no_show');

    const avgWaitTime = completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.actualWaitTime || 0), 0) / completed.length
      : 0;

    trends.unshift({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      totalAppointments: appointments.length,
      completionRate: appointments.length > 0 ? ((completed.length / appointments.length) * 100).toFixed(1) : 0,
      noShowRate: appointments.length > 0 ? ((noShows.length / appointments.length) * 100).toFixed(1) : 0,
      avgWaitTime: Math.round(avgWaitTime)
    });
  }

  return trends;
}

// Helper functions

function calculateTrend(byDay) {
  const days = Object.keys(byDay).sort();
  if (days.length < 7) return 'insufficient_data';

  const midIndex = Math.floor(days.length / 2);
  const firstHalf = days.slice(0, midIndex).reduce((sum, d) => sum + byDay[d], 0) / midIndex;
  const secondHalf = days.slice(midIndex).reduce((sum, d) => sum + byDay[d], 0) / (days.length - midIndex);

  if (secondHalf > firstHalf * 1.1) return 'increasing';
  if (secondHalf < firstHalf * 0.9) return 'decreasing';
  return 'stable';
}

function calculateEfficiencyScore(utilization, underutilized, overloaded) {
  let score = 100;

  // Ideal utilization is 70-85%
  if (utilization < 50) score -= 20;
  else if (utilization < 70) score -= 10;
  else if (utilization > 90) score -= 15;

  // Penalties for inconsistency
  score -= underutilized * 2;
  score -= overloaded * 3;

  return Math.max(0, Math.min(100, score)).toFixed(0);
}

function calculateDoctorEfficiency(completed, avgWaitTime, noShows) {
  let score = 50;

  // Volume factor
  score += Math.min(20, completed / 5);

  // Wait time factor (lower is better)
  if (avgWaitTime <= 10) score += 15;
  else if (avgWaitTime <= 20) score += 10;
  else if (avgWaitTime <= 30) score += 5;
  else score -= 5;

  // No-show penalty
  score -= noShows * 2;

  return Math.max(0, Math.min(100, score)).toFixed(0);
}

function generateNoShowRecommendations(rate, byHour, byDayOfWeek) {
  const recommendations = [];

  if (rate > 20) {
    recommendations.push('Consider implementing SMS reminders 24 hours before appointments');
    recommendations.push('Review appointment booking process for friction points');
  }

  if (rate > 10) {
    recommendations.push('Enable smart overbooking to compensate for no-shows');
  }

  const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
  if (peakHour && peakHour[1] > 3) {
    recommendations.push(`High no-shows at ${peakHour[0]}:00 - consider adjusting slot availability`);
  }

  return recommendations;
}

function generateSchedulingRecommendations(hourlyStats, peakHours) {
  const recommendations = [];

  // Find hours with long wait times
  const highWaitHours = hourlyStats.filter(h => h.avgWaitTime > 30 && h.appointmentCount > 2);
  if (highWaitHours.length > 0) {
    recommendations.push(`Consider reducing appointments at ${highWaitHours.map(h => h.hour + ':00').join(', ')} - high wait times observed`);
  }

  // Find underutilized hours
  const avgCount = hourlyStats.reduce((sum, h) => sum + h.appointmentCount, 0) / hourlyStats.length;
  const underutilized = hourlyStats.filter(h => h.appointmentCount < avgCount * 0.5 && h.hour >= 9 && h.hour <= 17);
  if (underutilized.length > 0) {
    recommendations.push(`Hours ${underutilized.map(h => h.hour + ':00').join(', ')} are underutilized - consider promoting these slots`);
  }

  return recommendations;
}

module.exports = {
  getDoctorAnalytics,
  getAppointmentStats,
  getWaitTimeStats,
  getUtilizationData,
  getNoShowStats,
  getPatientSatisfaction,
  getPeakHoursAnalysis,
  getDoctorComparison,
  getEfficiencyTrends
};

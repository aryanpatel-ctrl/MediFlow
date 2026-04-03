const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Get no-show probability and duration prediction from ML service
 */
async function getPredictions(patientId, triageData) {
  try {
    const { User, Appointment } = require('../models');

    // Get patient data
    const patient = await User.findById(patientId);

    if (!patient) {
      return getDefaultPredictions();
    }

    // Get appointment history
    const appointmentHistory = await Appointment.find({
      patientId,
      status: { $in: ['completed', 'no_show', 'cancelled'] }
    })
      .sort({ date: -1 })
      .limit(10);

    // Prepare features for ML model
    const features = {
      // Patient features
      age: patient.getAge() || 30,
      gender: patient.gender === 'male' ? 1 : 0,
      totalAppointments: patient.totalAppointments || 0,
      noShowCount: patient.noShowCount || 0,
      cancelledCount: patient.cancelledCount || 0,
      noShowRate: patient.totalAppointments > 0
        ? (patient.noShowCount / patient.totalAppointments) * 100
        : 0,

      // Triage features
      urgencyScore: triageData?.urgencyScore || 3,
      symptomsCount: triageData?.symptoms?.length || 1,
      hasRedFlags: (triageData?.redFlags?.length || 0) > 0 ? 1 : 0,

      // Time features
      dayOfWeek: new Date().getDay(),
      hour: new Date().getHours(),
      isWeekend: [0, 6].includes(new Date().getDay()) ? 1 : 0,

      // History features
      recentNoShows: appointmentHistory
        .filter(a => a.status === 'no_show')
        .slice(0, 3).length,
      avgPastWaitTime: calculateAvgWaitTime(appointmentHistory)
    };

    // Call ML service
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, features, {
      timeout: 5000
    });

    return {
      noShowProbability: response.data.no_show_probability,
      duration: response.data.predicted_duration,
      riskLevel: getRiskLevel(response.data.no_show_probability)
    };
  } catch (error) {
    console.error('ML Service Error:', error.message);
    return getDefaultPredictions();
  }
}

/**
 * Get default predictions when ML service is unavailable
 */
function getDefaultPredictions() {
  return {
    noShowProbability: 0.15, // 15% default no-show rate
    duration: 15, // 15 minutes default
    riskLevel: 'low'
  };
}

/**
 * Calculate risk level from probability
 */
function getRiskLevel(probability) {
  if (probability >= 0.5) return 'high';
  if (probability >= 0.3) return 'medium';
  return 'low';
}

/**
 * Calculate average wait time from history
 */
function calculateAvgWaitTime(appointments) {
  const withWaitTime = appointments.filter(a => a.actualWaitTime);
  if (withWaitTime.length === 0) return 15;

  const total = withWaitTime.reduce((sum, a) => sum + a.actualWaitTime, 0);
  return Math.round(total / withWaitTime.length);
}

/**
 * Batch predict for queue optimization
 */
async function batchPredict(appointments) {
  try {
    const predictions = await Promise.all(
      appointments.map(apt =>
        getPredictions(apt.patientId, apt.triageData)
      )
    );

    return appointments.map((apt, i) => ({
      appointmentId: apt._id,
      ...predictions[i]
    }));
  } catch (error) {
    console.error('Batch prediction error:', error);
    return appointments.map(apt => ({
      appointmentId: apt._id,
      ...getDefaultPredictions()
    }));
  }
}

/**
 * Get optimized queue order based on predictions
 */
async function getOptimizedQueueOrder(appointments) {
  const predictions = await batchPredict(appointments);

  // Score each appointment
  const scored = predictions.map((pred, i) => {
    const apt = appointments[i];
    const urgency = apt.triageData?.urgencyScore || 3;

    // Higher score = higher priority
    let score = urgency * 20; // Urgency is primary factor

    // Lower no-show probability = higher priority
    score += (1 - pred.noShowProbability) * 10;

    // Earlier slot time = higher priority
    const slotMinutes = timeToMinutes(apt.slotTime);
    score -= slotMinutes / 60; // Slight penalty for later slots

    return {
      appointmentId: apt._id,
      score,
      prediction: pred
    };
  });

  // Sort by score (descending)
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Convert time string to minutes
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Send appointment reminders to high-risk patients
 */
async function identifyHighRiskAppointments(date) {
  const { Appointment } = require('../models');

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['booked', 'confirmed'] }
  }).populate('patientId');

  const predictions = await batchPredict(appointments);

  // Return appointments with high no-show risk
  return predictions
    .filter(p => p.noShowProbability >= 0.3)
    .map((p, i) => ({
      appointment: appointments[i],
      noShowProbability: p.noShowProbability,
      riskLevel: p.riskLevel
    }));
}

module.exports = {
  getPredictions,
  batchPredict,
  getOptimizedQueueOrder,
  identifyHighRiskAppointments,
  getRiskLevel
};

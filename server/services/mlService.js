const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Get no-show probability and duration prediction from ML service
 * Features aligned with trained model (v2.0)
 */
async function getPredictions(patientId, triageData, appointmentDate = null) {
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
      .limit(20);

    // Calculate historical stats
    const totalAppointments = patient.totalAppointments || appointmentHistory.length;
    const noShowCount = patient.noShowCount || appointmentHistory.filter(a => a.status === 'no_show').length;
    const cancelledCount = patient.cancelledCount || appointmentHistory.filter(a => a.status === 'cancelled').length;
    const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

    // Calculate days until appointment
    const apptDate = appointmentDate ? new Date(appointmentDate) : new Date();
    const now = new Date();
    const daysUntilAppointment = Math.max(0, Math.floor((apptDate - now) / (1000 * 60 * 60 * 24)));

    // Prepare features aligned with ML model (14 features)
    const features = {
      // Patient demographics
      age: patient.getAge ? patient.getAge() : (patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : 30),
      gender: patient.gender === 'male' ? 1 : 0,

      // Patient history
      totalAppointments,
      noShowCount,
      cancelledCount,
      noShowRate,

      // Triage/clinical features
      urgencyScore: triageData?.urgencyScore || 3,
      symptomsCount: triageData?.symptoms?.length || 1,
      hasRedFlags: (triageData?.redFlags?.length || 0) > 0 ? 1 : 0,

      // Temporal features
      dayOfWeek: apptDate.getDay(),
      hour: parseInt(triageData?.slotTime?.split(':')[0]) || 10,
      isWeekend: [0, 6].includes(apptDate.getDay()) ? 1 : 0,

      // Booking features
      daysUntilAppointment,
      smsReceived: patient.notificationPreferences?.sms !== false ? 1 : 0
    };

    // Call ML service
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, features, {
      timeout: 5000
    });

    return {
      noShowProbability: response.data.no_show_probability,
      duration: response.data.predicted_duration,
      riskLevel: response.data.risk_level,
      confidence: response.data.confidence || 'high'
    };
  } catch (error) {
    console.error('ML Service Error:', error.message);
    return getDefaultPredictions();
  }
}

/**
 * Get ML-enhanced wait time predictions for queue
 */
async function getMLWaitTimes(queueEntries, avgConsultationTime, currentDelay) {
  try {
    const { User } = require('../models');

    // Prepare entries with patient data
    const enrichedEntries = await Promise.all(
      queueEntries.map(async (entry) => {
        const patient = await User.findById(entry.patientId);
        const apptDate = new Date();

        return {
          id: entry._id?.toString(),
          age: patient?.getAge ? patient.getAge() : 30,
          gender: patient?.gender === 'male' ? 1 : 0,
          totalAppointments: patient?.totalAppointments || 0,
          noShowCount: patient?.noShowCount || 0,
          cancelledCount: patient?.cancelledCount || 0,
          noShowRate: patient?.totalAppointments > 0
            ? (patient.noShowCount / patient.totalAppointments) * 100
            : 0,
          urgencyScore: entry.urgencyScore || 3,
          symptomsCount: 1,
          hasRedFlags: entry.urgencyScore >= 4 ? 1 : 0,
          dayOfWeek: apptDate.getDay(),
          hour: parseInt(entry.slotTime?.split(':')[0]) || 10,
          isWeekend: [0, 6].includes(apptDate.getDay()) ? 1 : 0,
          daysUntilAppointment: 0,
          smsReceived: 1
        };
      })
    );

    const response = await axios.post(`${ML_SERVICE_URL}/predict-wait-time`, {
      queueEntries: enrichedEntries,
      avgConsultationTime,
      currentDelay
    }, {
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error('ML Wait Time Error:', error.message);
    return null;
  }
}

/**
 * Identify high-risk appointments that need intervention
 */
async function identifyHighRiskAppointments(date, threshold = 0.3) {
  const { Appointment, User } = require('../models');

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['booked', 'confirmed'] }
  }).populate('patientId');

  // Prepare appointments for ML service
  const appointmentsData = await Promise.all(
    appointments.map(async (apt) => {
      const patient = apt.patientId;
      const daysUntilAppointment = Math.max(0, Math.floor((apt.date - new Date()) / (1000 * 60 * 60 * 24)));

      return {
        id: apt._id.toString(),
        patientId: patient?._id?.toString(),
        age: patient?.getAge ? patient.getAge() : 30,
        gender: patient?.gender === 'male' ? 1 : 0,
        totalAppointments: patient?.totalAppointments || 0,
        noShowCount: patient?.noShowCount || 0,
        cancelledCount: patient?.cancelledCount || 0,
        noShowRate: patient?.totalAppointments > 0
          ? (patient.noShowCount / patient.totalAppointments) * 100
          : 0,
        urgencyScore: apt.triageData?.urgencyScore || 3,
        symptomsCount: apt.triageData?.symptoms?.length || 1,
        hasRedFlags: (apt.triageData?.redFlags?.length || 0) > 0 ? 1 : 0,
        dayOfWeek: apt.date.getDay(),
        hour: parseInt(apt.slotTime?.split(':')[0]) || 10,
        isWeekend: [0, 6].includes(apt.date.getDay()) ? 1 : 0,
        daysUntilAppointment,
        smsReceived: patient?.notificationPreferences?.sms !== false ? 1 : 0
      };
    })
  );

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/high-risk-alerts`, {
      appointments: appointmentsData,
      threshold
    }, {
      timeout: 10000
    });

    // Map back to appointment objects
    return response.data.appointments.map(risk => {
      const apt = appointments.find(a => a._id.toString() === risk.appointment_id);
      return {
        appointment: apt,
        noShowProbability: risk.no_show_probability,
        riskLevel: risk.risk_level,
        recommendedInterventions: risk.recommended_interventions
      };
    });
  } catch (error) {
    console.error('High risk detection error:', error.message);

    // Fallback: return appointments with high historical no-show rate
    return appointments
      .filter(apt => {
        const patient = apt.patientId;
        const rate = patient?.totalAppointments > 0
          ? (patient.noShowCount / patient.totalAppointments)
          : 0;
        return rate >= threshold;
      })
      .map(apt => ({
        appointment: apt,
        noShowProbability: apt.patientId?.noShowCount / apt.patientId?.totalAppointments || 0.15,
        riskLevel: 'medium',
        recommendedInterventions: ['Send SMS reminder']
      }));
  }
}

/**
 * Get optimized queue order based on ML predictions
 */
async function getOptimizedQueueOrder(appointments) {
  try {
    const { User } = require('../models');

    // Prepare appointments with patient data
    const appointmentsData = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await User.findById(apt.patientId);

        return {
          id: apt._id?.toString(),
          age: patient?.getAge ? patient.getAge() : 30,
          gender: patient?.gender === 'male' ? 1 : 0,
          totalAppointments: patient?.totalAppointments || 0,
          noShowCount: patient?.noShowCount || 0,
          cancelledCount: patient?.cancelledCount || 0,
          noShowRate: patient?.totalAppointments > 0
            ? (patient.noShowCount / patient.totalAppointments) * 100
            : 0,
          urgencyScore: apt.triageData?.urgencyScore || 3,
          symptomsCount: apt.triageData?.symptoms?.length || 1,
          hasRedFlags: (apt.triageData?.redFlags?.length || 0) > 0 ? 1 : 0,
          dayOfWeek: new Date().getDay(),
          hour: parseInt(apt.slotTime?.split(':')[0]) || 10,
          isWeekend: [0, 6].includes(new Date().getDay()) ? 1 : 0,
          daysUntilAppointment: 0,
          smsReceived: 1,
          checkedIn: apt.status === 'checked_in',
          waitingMinutes: apt.checkInTime
            ? Math.floor((new Date() - apt.checkInTime) / (1000 * 60))
            : 0
        };
      })
    );

    const response = await axios.post(`${ML_SERVICE_URL}/optimize-queue`, {
      appointments: appointmentsData
    }, {
      timeout: 10000
    });

    return response.data.optimized_order;
  } catch (error) {
    console.error('Queue optimization error:', error.message);

    // Fallback: sort by urgency and slot time
    return appointments.map((apt, i) => ({
      appointmentId: apt._id,
      score: (apt.triageData?.urgencyScore || 3) * 20,
      prediction: getDefaultPredictions()
    })).sort((a, b) => b.score - a.score);
  }
}

/**
 * Batch predict for multiple appointments
 */
async function batchPredict(appointments) {
  try {
    const { User } = require('../models');

    const appointmentsData = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await User.findById(apt.patientId);
        const daysUntilAppointment = Math.max(0, Math.floor((apt.date - new Date()) / (1000 * 60 * 60 * 24)));

        return {
          id: apt._id?.toString(),
          age: patient?.getAge ? patient.getAge() : 30,
          gender: patient?.gender === 'male' ? 1 : 0,
          totalAppointments: patient?.totalAppointments || 0,
          noShowCount: patient?.noShowCount || 0,
          cancelledCount: patient?.cancelledCount || 0,
          noShowRate: patient?.totalAppointments > 0
            ? (patient.noShowCount / patient.totalAppointments) * 100
            : 0,
          urgencyScore: apt.triageData?.urgencyScore || 3,
          symptomsCount: apt.triageData?.symptoms?.length || 1,
          hasRedFlags: (apt.triageData?.redFlags?.length || 0) > 0 ? 1 : 0,
          dayOfWeek: apt.date?.getDay() || new Date().getDay(),
          hour: parseInt(apt.slotTime?.split(':')[0]) || 10,
          isWeekend: [0, 6].includes(apt.date?.getDay() || new Date().getDay()) ? 1 : 0,
          daysUntilAppointment,
          smsReceived: patient?.notificationPreferences?.sms !== false ? 1 : 0
        };
      })
    );

    const response = await axios.post(`${ML_SERVICE_URL}/batch-predict`, {
      appointments: appointmentsData
    }, {
      timeout: 10000
    });

    return response.data.predictions;
  } catch (error) {
    console.error('Batch prediction error:', error);
    return appointments.map(apt => ({
      appointmentId: apt._id,
      ...getDefaultPredictions()
    }));
  }
}

/**
 * Get default predictions when ML service is unavailable
 */
function getDefaultPredictions() {
  return {
    noShowProbability: 0.15,
    duration: 15,
    riskLevel: 'low',
    confidence: 'fallback'
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
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 30;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, Math.min(100, age));
}

module.exports = {
  getPredictions,
  getMLWaitTimes,
  batchPredict,
  getOptimizedQueueOrder,
  identifyHighRiskAppointments,
  getRiskLevel,
  getDefaultPredictions
};

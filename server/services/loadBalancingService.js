const { Doctor, Queue, Appointment, Hospital } = require('../models');

/**
 * Load Balancing Service
 * Optimizes patient distribution across doctors to reduce wait times
 */

/**
 * Get all doctors with same specialty in the hospital
 */
async function getDoctorsBySpecialty(hospitalId, specialty) {
  return await Doctor.find({
    hospitalId,
    specialty,
    isActive: true,
    isAcceptingPatients: true
  }).populate('userId', 'name email');
}

/**
 * Calculate current load score for a doctor
 * Lower score = less busy = better for new appointments
 */
async function calculateDoctorLoad(doctorId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get today's appointments count
  const appointmentsCount = await Appointment.countDocuments({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no_show', 'rescheduled'] }
  });

  // Get current queue status
  const queue = await Queue.findOne({
    doctorId,
    date: startOfDay
  });

  const waitingPatients = queue?.entries?.filter(e => e.status === 'waiting').length || 0;
  const avgWaitTime = queue?.avgWaitTime || 0;
  const currentDelay = queue?.currentDelay || 0;

  // Get doctor's max patients per day (estimate based on working hours)
  const doctor = await Doctor.findById(doctorId);
  const avgConsultationTime = doctor?.avgConsultationTime || 15;

  // Estimate max patients: 8 hours * 60 / avgConsultationTime
  const maxPatientsPerDay = Math.floor((8 * 60) / avgConsultationTime);

  // Calculate load percentage
  const loadPercentage = (appointmentsCount / maxPatientsPerDay) * 100;

  // Calculate load score (0-100, lower is better)
  const loadScore = Math.min(100,
    (loadPercentage * 0.4) +
    (waitingPatients * 5) +
    (currentDelay * 0.5) +
    (avgWaitTime * 0.3)
  );

  return {
    doctorId,
    doctorName: doctor?.userId?.name || 'Doctor',
    specialty: doctor?.specialty,
    appointmentsCount,
    waitingPatients,
    avgWaitTime,
    currentDelay,
    loadPercentage: Math.round(loadPercentage),
    loadScore: Math.round(loadScore),
    maxPatientsPerDay,
    availableSlots: maxPatientsPerDay - appointmentsCount,
    queueStatus: queue?.status || 'not_started'
  };
}

/**
 * Find the least busy doctor for a given specialty
 * Returns alternative doctor suggestions
 */
async function findLeastBusyDoctor(hospitalId, specialty, preferredDoctorId = null, date = new Date()) {
  const doctors = await getDoctorsBySpecialty(hospitalId, specialty);

  if (doctors.length === 0) {
    return {
      success: false,
      message: 'No available doctors found for this specialty'
    };
  }

  // Calculate load for all doctors
  const doctorLoads = await Promise.all(
    doctors.map(async (doctor) => {
      const load = await calculateDoctorLoad(doctor._id, date);
      return {
        ...load,
        doctor,
        isPreferred: doctor._id.toString() === preferredDoctorId?.toString()
      };
    })
  );

  // Sort by load score (ascending - least busy first)
  doctorLoads.sort((a, b) => a.loadScore - b.loadScore);

  const leastBusy = doctorLoads[0];
  const preferredDoctor = doctorLoads.find(d => d.isPreferred);

  // Check if preferred doctor is significantly busier
  const shouldSuggestAlternative = preferredDoctor &&
    (preferredDoctor.loadScore - leastBusy.loadScore > 20 ||
     preferredDoctor.loadPercentage > 80);

  return {
    success: true,
    recommendedDoctor: leastBusy.doctor,
    recommendedDoctorLoad: leastBusy,
    preferredDoctorLoad: preferredDoctor,
    shouldSuggestAlternative,
    alternatives: doctorLoads.slice(0, 3).map(d => ({
      doctorId: d.doctor._id,
      doctorName: d.doctor.userId?.name,
      loadScore: d.loadScore,
      loadPercentage: d.loadPercentage,
      waitingPatients: d.waitingPatients,
      estimatedWaitTime: d.avgWaitTime + d.currentDelay,
      availableSlots: d.availableSlots
    })),
    allDoctorsLoad: doctorLoads
  };
}

/**
 * Get hospital-wide load distribution
 */
async function getHospitalLoadDistribution(hospitalId, date = new Date()) {
  const doctors = await Doctor.find({ hospitalId, isActive: true })
    .populate('userId', 'name');

  const loads = await Promise.all(
    doctors.map(doctor => calculateDoctorLoad(doctor._id, date))
  );

  // Group by specialty
  const bySpecialty = loads.reduce((acc, load) => {
    const specialty = load.specialty || 'General';
    if (!acc[specialty]) {
      acc[specialty] = [];
    }
    acc[specialty].push(load);
    return acc;
  }, {});

  // Calculate averages
  const totalAppointments = loads.reduce((sum, l) => sum + l.appointmentsCount, 0);
  const totalWaiting = loads.reduce((sum, l) => sum + l.waitingPatients, 0);
  const avgLoadScore = loads.length > 0
    ? Math.round(loads.reduce((sum, l) => sum + l.loadScore, 0) / loads.length)
    : 0;

  // Find bottlenecks (doctors with >80% load)
  const bottlenecks = loads.filter(l => l.loadPercentage > 80);

  // Find underutilized (<30% load)
  const underutilized = loads.filter(l => l.loadPercentage < 30);

  return {
    hospitalId,
    date,
    summary: {
      totalDoctors: doctors.length,
      totalAppointments,
      totalWaiting,
      avgLoadScore,
      bottleneckCount: bottlenecks.length,
      underutilizedCount: underutilized.length
    },
    bySpecialty,
    bottlenecks,
    underutilized,
    allDoctors: loads.sort((a, b) => b.loadScore - a.loadScore)
  };
}

/**
 * Smart overbooking - determine if a slot can be overbooked
 */
async function canOverbook(doctorId, date, slotTime) {
  const doctor = await Doctor.findById(doctorId).populate('hospitalId');
  const hospital = doctor?.hospitalId;

  // Check if smart overbooking is enabled
  if (!hospital?.smartOverbookingEnabled) {
    return { canOverbook: false, reason: 'Smart overbooking is disabled' };
  }

  const overbookingPercentage = hospital.overbookingPercentage || 10;

  // Get appointments for this slot
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const slotAppointments = await Appointment.countDocuments({
    doctorId,
    date: startOfDay,
    slotTime,
    status: { $nin: ['cancelled', 'no_show', 'rescheduled'] }
  });

  // Get historical no-show rate for this doctor
  const totalPastAppointments = await Appointment.countDocuments({
    doctorId,
    status: { $in: ['completed', 'no_show'] },
    date: { $lt: startOfDay }
  });

  const noShowCount = await Appointment.countDocuments({
    doctorId,
    status: 'no_show',
    date: { $lt: startOfDay }
  });

  const noShowRate = totalPastAppointments > 0
    ? (noShowCount / totalPastAppointments) * 100
    : 0;

  // Allow overbooking if:
  // 1. No-show rate is significant (> 5%)
  // 2. Current slot isn't already overbooked beyond limit
  const maxOverbooking = Math.ceil(1 * (overbookingPercentage / 100)); // 1 extra per slot at 10%

  if (slotAppointments >= 2) { // Already has 2 appointments in this slot
    return {
      canOverbook: false,
      reason: 'Slot is already at maximum capacity'
    };
  }

  if (noShowRate >= 5 && slotAppointments < 2) {
    return {
      canOverbook: true,
      reason: `Historical no-show rate is ${noShowRate.toFixed(1)}%`,
      noShowRate,
      currentSlotBookings: slotAppointments
    };
  }

  return {
    canOverbook: false,
    reason: 'No-show rate is too low to justify overbooking',
    noShowRate,
    currentSlotBookings: slotAppointments
  };
}

/**
 * Suggest optimal appointment slot considering load balancing
 */
async function suggestOptimalAppointment(hospitalId, specialty, urgencyScore = 3, preferredDate = null) {
  const doctors = await getDoctorsBySpecialty(hospitalId, specialty);

  if (doctors.length === 0) {
    return { success: false, message: 'No doctors available for this specialty' };
  }

  const suggestions = [];
  const checkDays = urgencyScore >= 4 ? 3 : 7; // Urgent: 3 days, Normal: 7 days

  for (let dayOffset = 0; dayOffset < checkDays; dayOffset++) {
    const date = preferredDate ? new Date(preferredDate) : new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    // Skip past dates
    if (date < new Date().setHours(0, 0, 0, 0)) continue;

    for (const doctor of doctors) {
      const load = await calculateDoctorLoad(doctor._id, date);

      // Skip if doctor is too busy (>90% load)
      if (load.loadPercentage > 90) continue;

      // Get available slots for this doctor on this date
      const { getAvailableSlots } = require('./slotGenerator');
      const slots = await getAvailableSlots(doctor._id, date);

      for (const slot of slots.slice(0, 3)) { // Top 3 slots per doctor
        suggestions.push({
          doctorId: doctor._id,
          doctorName: doctor.userId?.name,
          specialty: doctor.specialty,
          date,
          slotTime: slot,
          loadScore: load.loadScore,
          estimatedWaitTime: load.avgWaitTime,
          dayOffset
        });
      }
    }
  }

  // Sort by: urgency priority, load score, then date
  suggestions.sort((a, b) => {
    // For urgent cases, prioritize earlier dates
    if (urgencyScore >= 4) {
      if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
    }
    // Then by load score
    if (a.loadScore !== b.loadScore) return a.loadScore - b.loadScore;
    // Then by date
    return a.date - b.date;
  });

  return {
    success: true,
    urgencyScore,
    suggestions: suggestions.slice(0, 10), // Top 10 suggestions
    totalOptions: suggestions.length
  };
}

/**
 * Auto-redistribute patients when a doctor becomes unavailable
 */
async function redistributePatients(unavailableDoctorId, date, reason = 'Doctor unavailable') {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get affected appointments
  const affectedAppointments = await Appointment.find({
    doctorId: unavailableDoctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'completed', 'no_show'] }
  }).populate('patientId', 'name email phone');

  if (affectedAppointments.length === 0) {
    return { success: true, message: 'No appointments to redistribute', count: 0 };
  }

  const doctor = await Doctor.findById(unavailableDoctorId);
  const alternatives = await findLeastBusyDoctor(
    doctor.hospitalId,
    doctor.specialty,
    null,
    date
  );

  if (!alternatives.success || alternatives.alternatives.length === 0) {
    return {
      success: false,
      message: 'No alternative doctors available',
      affectedCount: affectedAppointments.length
    };
  }

  const redistributed = [];
  const failed = [];

  for (const appointment of affectedAppointments) {
    // Find best available alternative
    let reassigned = false;

    for (const alt of alternatives.alternatives) {
      if (alt.availableSlots > 0) {
        // Update appointment to new doctor
        appointment.doctorId = alt.doctorId;
        appointment.rescheduledFrom = {
          originalDoctorId: unavailableDoctorId,
          reason,
          rescheduledAt: new Date()
        };
        await appointment.save();

        redistributed.push({
          appointmentId: appointment._id,
          patientName: appointment.patientId?.name,
          newDoctorId: alt.doctorId,
          newDoctorName: alt.doctorName
        });
        reassigned = true;
        break;
      }
    }

    if (!reassigned) {
      failed.push({
        appointmentId: appointment._id,
        patientName: appointment.patientId?.name,
        reason: 'All alternative doctors are fully booked'
      });
    }
  }

  return {
    success: true,
    message: `Redistributed ${redistributed.length} of ${affectedAppointments.length} appointments`,
    redistributed,
    failed,
    totalAffected: affectedAppointments.length
  };
}

module.exports = {
  getDoctorsBySpecialty,
  calculateDoctorLoad,
  findLeastBusyDoctor,
  getHospitalLoadDistribution,
  canOverbook,
  suggestOptimalAppointment,
  redistributePatients
};

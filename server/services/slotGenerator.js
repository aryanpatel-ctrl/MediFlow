const { Appointment } = require('../models');

/**
 * Generate time slots for a given time range
 */
function generateTimeSlots(startTime, endTime, duration) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    slots.push(timeString);
    currentMinutes += duration;
  }

  return slots;
}

/**
 * Get available slots for a doctor on a specific date
 */
async function getAvailableSlots(doctor, date) {
  // Get day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[date.getDay()];

  // Check if doctor is available on this day
  const daySchedule = doctor.availability?.[dayOfWeek];
  if (!daySchedule || !daySchedule.isAvailable) {
    return [];
  }

  // Check if date is blocked
  const dateString = date.toISOString().split('T')[0];
  const isBlocked = doctor.blockedDates?.some(blocked => {
    const blockedDate = new Date(blocked.date).toISOString().split('T')[0];
    return blockedDate === dateString;
  });

  if (isBlocked) {
    return [];
  }

  // Generate all possible slots from schedule
  const allSlots = [];
  const timeRanges = daySchedule.slots || [];

  for (const range of timeRanges) {
    const slots = generateTimeSlots(range.startTime, range.endTime, doctor.slotDuration);
    allSlots.push(...slots);
  }

  // Get booked appointments for this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await Appointment.find({
    doctorId: doctor._id,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no_show', 'rescheduled'] }
  }).select('slotTime');

  const bookedSlots = new Set(bookedAppointments.map(apt => apt.slotTime));

  // Check if date is today and filter past slots
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  // Build available slots with availability status
  const availableSlots = allSlots.map(time => {
    let available = !bookedSlots.has(time);

    // If today, check if slot is in the past
    if (isToday && available) {
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = new Date(date);
      slotTime.setHours(hours, minutes, 0, 0);

      // Add 15 minute buffer - can't book slots less than 15 min away
      const bufferTime = new Date(now.getTime() + 15 * 60 * 1000);
      available = slotTime > bufferTime;
    }

    return {
      time,
      available,
      booked: bookedSlots.has(time)
    };
  });

  return availableSlots;
}

/**
 * Find next available slot for a doctor
 */
async function findNextAvailableSlot(doctor, startDate = new Date()) {
  const maxDaysToCheck = 30;
  let currentDate = new Date(startDate);

  for (let i = 0; i < maxDaysToCheck; i++) {
    const slots = await getAvailableSlots(doctor, currentDate);
    const availableSlot = slots.find(s => s.available);

    if (availableSlot) {
      return {
        date: currentDate,
        time: availableSlot.time
      };
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return null;
}

/**
 * Get available dates for next N days
 */
async function getAvailableDates(doctor, days = 14) {
  const availableDates = [];
  const currentDate = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + i);

    const slots = await getAvailableSlots(doctor, date);
    const availableCount = slots.filter(s => s.available).length;

    if (availableCount > 0) {
      availableDates.push({
        date: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        availableSlots: availableCount,
        totalSlots: slots.length
      });
    }
  }

  return availableDates;
}

/**
 * Suggest optimal slot based on urgency and availability
 */
async function suggestOptimalSlot(doctor, urgencyScore = 3) {
  const today = new Date();
  let searchDays = 14;

  // For high urgency, prioritize today/tomorrow
  if (urgencyScore >= 4) {
    searchDays = 3;
  } else if (urgencyScore === 5) {
    searchDays = 1; // Only today for emergency
  }

  for (let i = 0; i < searchDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const slots = await getAvailableSlots(doctor, date);
    const availableSlots = slots.filter(s => s.available);

    if (availableSlots.length > 0) {
      // For high urgency, return first available
      if (urgencyScore >= 4) {
        return {
          date,
          time: availableSlots[0].time,
          isUrgent: true
        };
      }

      // For normal urgency, prefer mid-morning slots (10:00-12:00)
      const preferredSlot = availableSlots.find(s => {
        const hour = parseInt(s.time.split(':')[0]);
        return hour >= 10 && hour < 12;
      });

      return {
        date,
        time: preferredSlot?.time || availableSlots[0].time,
        isUrgent: false
      };
    }
  }

  // No slots found in preferred range, extend search
  return findNextAvailableSlot(doctor, today);
}

module.exports = {
  generateTimeSlots,
  getAvailableSlots,
  findNextAvailableSlot,
  getAvailableDates,
  suggestOptimalSlot
};

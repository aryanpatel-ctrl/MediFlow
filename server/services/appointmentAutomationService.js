const { Appointment, Doctor, Hospital, Notification, User } = require('../models');
const { AppError } = require('../middleware');
const slotGenerator = require('./slotGenerator');
const calendarService = require('./calendarService');
const notificationService = require('./notificationService');

function sanitizeReason(reason, fallback) {
  return (reason || fallback || '').trim().slice(0, 500);
}

async function markAppointmentConfirmed(appointmentId, context = {}) {
  // Populate appointment with all required details for Google Calendar
  const appointment = await Appointment.findById(appointmentId)
    .populate('patientId', 'name email phone')
    .populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospitalId', 'name address googleCalendar features');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (['cancelled', 'completed', 'no_show', 'rescheduled'].includes(appointment.status)) {
    throw new AppError(`Cannot confirm appointment with status: ${appointment.status}`, 400);
  }

  if (appointment.status === 'booked') {
    appointment.status = 'confirmed';
  }

  appointment.attendanceConfirmation = {
    ...appointment.attendanceConfirmation,
    status: 'confirmed',
    callAttemptCount: appointment.attendanceConfirmation?.callAttemptCount || 0,
    lastCallAttemptAt: context.callAt || new Date(),
    lastCallLogId: context.callLogId || appointment.attendanceConfirmation?.lastCallLogId,
    lastOutcome: 'confirmed',
    lastConfirmedAt: new Date(),
    lastActionSource: 'ai_call'
  };

  await appointment.save();

  // Add to Google Calendar if connected and not already added
  const hospital = appointment.hospitalId;
  if (hospital &&
      hospital.googleCalendar?.connected &&
      hospital.features?.googleCalendarEnabled &&
      !appointment.googleCalendarEventId) {
    try {
      const patient = appointment.patientId;
      const doctor = appointment.doctorId;

      // Calculate end time (assuming 30 min slots)
      const [startHour, startMin] = appointment.slotTime.split(':').map(Number);
      const endHour = startMin >= 30 ? startHour + 1 : startHour;
      const endMin = startMin >= 30 ? startMin - 30 : startMin + 30;
      const slotEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      const calendarEvent = await calendarService.createAppointmentEvent(hospital, {
        patientName: patient?.name || 'Patient',
        patientEmail: patient?.email,
        patientPhone: patient?.phone,
        doctorName: doctor?.userId?.name || 'Doctor',
        specialty: doctor?.specialty || 'General Medicine',
        date: appointment.date.toISOString().split('T')[0],
        slotTime: appointment.slotTime,
        slotEndTime: slotEndTime,
        triageSummary: appointment.triageSummary,
        hospitalName: hospital.name,
        hospitalAddress: hospital.address
      });

      appointment.googleCalendarEventId = calendarEvent.eventId;
      await appointment.save();

      console.log(`[AI Call] Google Calendar event created for appointment ${appointmentId}`);
    } catch (error) {
      console.error('[AI Call] Failed to create Google Calendar event:', error.message);
      // Don't throw - calendar is optional, appointment is still confirmed
    }
  }

  await Notification.createAppointmentNotification(
    appointment.patientId._id || appointment.patientId,
    'appointment_confirmed',
    appointment._id,
    {
      title: 'Appointment Confirmed',
      message: 'Your appointment has been confirmed through our automated reminder call.'
    }
  );

  return appointment;
}

async function cancelAppointmentFromAICall(appointmentId, reason, context = {}) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
    throw new AppError(`Cannot cancel appointment with status: ${appointment.status}`, 400);
  }

  const cancellationReason = sanitizeReason(reason, 'Cancelled during automated reminder call');

  appointment.status = 'cancelled';
  appointment.cancellationReason = cancellationReason;
  appointment.cancelledBy = 'system';
  appointment.attendanceConfirmation = {
    ...appointment.attendanceConfirmation,
    status: 'cancelled',
    lastCallAttemptAt: context.callAt || new Date(),
    lastCallLogId: context.callLogId || appointment.attendanceConfirmation?.lastCallLogId,
    lastOutcome: 'cancelled',
    lastActionSource: 'ai_call'
  };
  await appointment.save();

  await User.findByIdAndUpdate(appointment.patientId, {
    $inc: { cancelledCount: 1 }
  });

  await Notification.createAppointmentNotification(
    appointment.patientId,
    'appointment_cancelled',
    appointment._id,
    {
      title: 'Appointment Cancelled',
      message: `Your appointment has been cancelled. Reason: ${cancellationReason}`
    }
  );

  if (appointment.googleCalendarEventId) {
    try {
      const hospital = await Hospital.findById(appointment.hospitalId);
      if (hospital && hospital.googleCalendar?.connected) {
        await calendarService.deleteAppointmentEvent(hospital, appointment.googleCalendarEventId);
        appointment.googleCalendarEventId = null;
        await appointment.save();
      }
    } catch (error) {
      console.error('Google Calendar cancellation sync failed:', error.message);
    }
  }

  notificationService.sendAppointmentCancellation(appointment, cancellationReason).catch((error) => {
    console.error('Automated cancellation notification failed:', error.message);
  });

  return appointment;
}

async function createRescheduleRequestFromAICall(appointmentId, payload = {}, context = {}) {
  const appointment = await Appointment.findById(appointmentId).populate({
    path: 'doctorId',
    populate: { path: 'userId', select: 'name _id' }
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (!['booked', 'confirmed'].includes(appointment.status)) {
    throw new AppError(`Cannot request reschedule with status: ${appointment.status}`, 400);
  }

  if (appointment.rescheduleCount >= 2) {
    throw new AppError('Maximum reschedule limit reached', 400);
  }

  if (appointment.rescheduleRequest?.status === 'pending') {
    throw new AppError('A reschedule request is already pending for this appointment', 400);
  }

  const { preferredDate, preferredSlotTime, reason } = payload;

  if (!preferredDate || !preferredSlotTime || !reason) {
    throw new AppError('Preferred date, preferred slot time, and reason are required', 400);
  }

  const doctor = await Doctor.findById(appointment.doctorId._id || appointment.doctorId);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  const availableSlots = await slotGenerator.getAvailableSlots(doctor, new Date(preferredDate));
  const isSlotAvailable = availableSlots.some(
    (slot) => slot.time === preferredSlotTime && slot.available
  );

  if (!isSlotAvailable) {
    throw new AppError('Requested slot is not available for reschedule', 400);
  }

  appointment.rescheduleRequest = {
    status: 'pending',
    requestedDate: new Date(preferredDate),
    requestedSlotTime: preferredSlotTime,
    reason: sanitizeReason(reason, 'Requested during automated reminder call'),
    requestedBy: appointment.patientId,
    requestedAt: new Date()
  };

  appointment.attendanceConfirmation = {
    ...appointment.attendanceConfirmation,
    status: 'reschedule_requested',
    lastCallAttemptAt: context.callAt || new Date(),
    lastCallLogId: context.callLogId || appointment.attendanceConfirmation?.lastCallLogId,
    lastOutcome: 'reschedule_requested',
    lastActionSource: 'ai_call'
  };

  await appointment.save();

  const doctorUserId = appointment.doctorId?.userId?._id;
  if (doctorUserId) {
    await Notification.create({
      userId: doctorUserId,
      type: 'system',
      title: 'AI Call Reschedule Request',
      message: `${context.patientName || 'Patient'} requested a reschedule during the reminder call for ${new Date(preferredDate).toLocaleDateString('en-GB')} at ${preferredSlotTime}.`,
      appointmentId: appointment._id,
      doctorId: appointment.doctorId._id || appointment.doctorId,
      hospitalId: appointment.hospitalId,
      actionType: 'view_appointment',
      actionUrl: '/appointments',
      metadata: {
        source: 'ai_call',
        reason: appointment.rescheduleRequest.reason
      }
    });
  }

  await Notification.createAppointmentNotification(
    appointment.patientId,
    'appointment_rescheduled',
    appointment._id,
    {
      title: 'Reschedule Request Submitted',
      message: `We submitted your reschedule request for ${new Date(preferredDate).toLocaleDateString('en-GB')} at ${preferredSlotTime}.`
    }
  );

  return appointment;
}

module.exports = {
  markAppointmentConfirmed,
  cancelAppointmentFromAICall,
  createRescheduleRequestFromAICall
};

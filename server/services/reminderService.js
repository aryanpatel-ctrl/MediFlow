/**
 * Appointment Reminder Service
 * Sends automated reminders 24 hours and 1 hour before appointments
 */

const { Appointment, User, Doctor, Hospital, Notification } = require('../models');
const { sendEmail, sendSMS, sendPushNotification } = require('./notificationService');

let reminder24hInterval = null;
let reminder1hInterval = null;

/**
 * Send 24-hour reminders
 */
async function send24HourReminders() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find appointments 24 hours from now (with 30 min window)
  const windowStart = new Date(tomorrow.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(tomorrow.getTime() + 30 * 60 * 1000);

  const appointments = await Appointment.find({
    date: { $gte: windowStart, $lte: windowEnd },
    status: { $in: ['booked', 'confirmed'] },
    'reminders.sent24h': { $ne: true }
  })
    .populate('patientId', 'name email phone fcmToken notificationPreferences')
    .populate('doctorId')
    .populate('hospitalId', 'name address phone');

  console.log(`[Reminder] Found ${appointments.length} appointments for 24h reminder`);

  for (const apt of appointments) {
    try {
      await sendReminder(apt, '24h');

      // Mark as sent
      await Appointment.findByIdAndUpdate(apt._id, {
        'reminders.sent24h': true,
        'reminders.sent24hAt': new Date()
      });
    } catch (error) {
      console.error(`[Reminder] Failed to send 24h reminder for ${apt._id}:`, error.message);
    }
  }

  return appointments.length;
}

/**
 * Send 1-hour reminders
 */
async function send1HourReminders() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Find appointments 1 hour from now (with 15 min window)
  const windowStart = new Date(oneHourLater.getTime() - 15 * 60 * 1000);
  const windowEnd = new Date(oneHourLater.getTime() + 15 * 60 * 1000);

  // We need to match date AND time
  const appointments = await Appointment.find({
    status: { $in: ['booked', 'confirmed'] },
    'reminders.sent1h': { $ne: true }
  })
    .populate('patientId', 'name email phone fcmToken notificationPreferences')
    .populate('doctorId')
    .populate('hospitalId', 'name address phone');

  // Filter appointments that are approximately 1 hour away
  const upcomingAppointments = appointments.filter(apt => {
    const [hours, minutes] = (apt.slotTime || '09:00').split(':').map(Number);
    const aptDateTime = new Date(apt.date);
    aptDateTime.setHours(hours, minutes, 0, 0);

    const diffMs = aptDateTime - now;
    const diffMins = diffMs / (1000 * 60);

    // Between 45 and 75 minutes from now
    return diffMins >= 45 && diffMins <= 75;
  });

  console.log(`[Reminder] Found ${upcomingAppointments.length} appointments for 1h reminder`);

  for (const apt of upcomingAppointments) {
    try {
      await sendReminder(apt, '1h');

      // Mark as sent
      await Appointment.findByIdAndUpdate(apt._id, {
        'reminders.sent1h': true,
        'reminders.sent1hAt': new Date()
      });
    } catch (error) {
      console.error(`[Reminder] Failed to send 1h reminder for ${apt._id}:`, error.message);
    }
  }

  return upcomingAppointments.length;
}

/**
 * Send reminder via all channels
 */
async function sendReminder(appointment, type) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const hospital = appointment.hospitalId;

  if (!patient) return;

  const doctorName = doctor?.userId?.name || 'your doctor';
  const hospitalName = hospital?.name || 'the hospital';
  const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const slotTime = appointment.slotTime || '09:00';

  const timeText = type === '24h' ? 'tomorrow' : 'in 1 hour';

  // Create in-app notification
  await Notification.create({
    userId: patient._id,
    type: 'appointment_reminder',
    title: `Appointment Reminder - ${timeText}`,
    message: `Your appointment with Dr. ${doctorName} is ${timeText} at ${slotTime}. Location: ${hospitalName}`,
    relatedId: appointment._id,
    relatedModel: 'Appointment',
    priority: type === '1h' ? 'high' : 'normal'
  });

  // Send Email
  if (patient.email && patient.notificationPreferences?.email !== false) {
    const emailSubject = type === '24h'
      ? `Reminder: Your appointment tomorrow at ${slotTime}`
      : `Reminder: Your appointment in 1 hour`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Reminder</h2>
        <p>Dear ${patient.name},</p>
        <p>This is a reminder that your appointment is scheduled for <strong>${timeText}</strong>.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${slotTime}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${hospitalName}</p>
          ${hospital?.address ? `<p style="margin: 5px 0;"><strong>Address:</strong> ${hospital.address.street}, ${hospital.address.city}</p>` : ''}
        </div>

        <p><strong>Please remember to:</strong></p>
        <ul>
          <li>Arrive 15 minutes early for check-in</li>
          <li>Bring your ID and insurance card</li>
          <li>Wear a mask if required</li>
        </ul>

        ${type === '1h' ? '<p style="color: #dc2626;"><strong>Your appointment is in 1 hour. Please start heading to the hospital now.</strong></p>' : ''}

        <p>If you need to reschedule, please contact us at ${hospital?.phone || 'the hospital'} or use the app.</p>

        <p>Best regards,<br>${hospitalName} Team</p>
      </div>
    `;

    await sendEmail(patient.email, emailSubject, emailHtml);
  }

  // Send SMS
  if (patient.phone && patient.notificationPreferences?.sms !== false) {
    const smsMessage = type === '24h'
      ? `Reminder: Your appointment with Dr. ${doctorName} is tomorrow at ${slotTime}. Location: ${hospitalName}. Reply CANCEL to cancel.`
      : `URGENT: Your appointment with Dr. ${doctorName} is in 1 HOUR at ${slotTime}. Please head to ${hospitalName} now.`;

    await sendSMS(patient.phone, smsMessage);
  }

  // Send Push Notification
  if (patient.fcmToken && patient.notificationPreferences?.push !== false) {
    await sendPushNotification(patient.fcmToken, {
      title: type === '24h' ? 'Appointment Tomorrow' : '⏰ Appointment in 1 Hour!',
      body: `Dr. ${doctorName} at ${slotTime}. ${type === '1h' ? 'Please head to the hospital now.' : 'Don\'t forget!'}`,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointment._id.toString(),
        reminderType: type
      }
    });
  }

  console.log(`[Reminder] Sent ${type} reminder to ${patient.name} for appointment ${appointment._id}`);
}

/**
 * Start reminder schedulers
 */
function startReminderScheduler() {
  console.log('Starting appointment reminder schedulers...');

  // Check for 24h reminders every 30 minutes
  reminder24hInterval = setInterval(async () => {
    const hour = new Date().getHours();
    // Only run between 7 AM and 10 PM
    if (hour >= 7 && hour <= 22) {
      try {
        const count = await send24HourReminders();
        if (count > 0) {
          console.log(`[Reminder] Sent ${count} 24-hour reminders`);
        }
      } catch (error) {
        console.error('[Reminder] 24h scheduler error:', error.message);
      }
    }
  }, 30 * 60 * 1000); // Every 30 minutes

  // Check for 1h reminders every 10 minutes
  reminder1hInterval = setInterval(async () => {
    const hour = new Date().getHours();
    // Only run between 6 AM and 11 PM
    if (hour >= 6 && hour <= 23) {
      try {
        const count = await send1HourReminders();
        if (count > 0) {
          console.log(`[Reminder] Sent ${count} 1-hour reminders`);
        }
      } catch (error) {
        console.error('[Reminder] 1h scheduler error:', error.message);
      }
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  console.log('Reminder schedulers started:');
  console.log('  - 24h reminders: every 30 minutes');
  console.log('  - 1h reminders: every 10 minutes');
}

/**
 * Stop reminder schedulers
 */
function stopReminderScheduler() {
  if (reminder24hInterval) {
    clearInterval(reminder24hInterval);
    reminder24hInterval = null;
  }
  if (reminder1hInterval) {
    clearInterval(reminder1hInterval);
    reminder1hInterval = null;
  }
  console.log('Reminder schedulers stopped');
}

/**
 * Manually trigger reminders (for testing)
 */
async function triggerReminders() {
  const results = {
    reminders24h: await send24HourReminders(),
    reminders1h: await send1HourReminders()
  };
  return results;
}

module.exports = {
  send24HourReminders,
  send1HourReminders,
  sendReminder,
  startReminderScheduler,
  stopReminderScheduler,
  triggerReminders
};

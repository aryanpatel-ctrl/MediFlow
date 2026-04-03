const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');

// Email transporter
let transporter = null;

function initializeTransporter() {
  if (!transporter && process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
}

/**
 * Send email notification
 */
async function sendEmail(to, subject, html) {
  try {
    const emailTransporter = initializeTransporter();
    if (!emailTransporter) {
      console.log('Email not configured, skipping');
      return { sent: false, error: 'Email not configured' };
    }

    const info = await emailTransporter.sendMail({
      from: `"MedQueue AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * Send SMS notification (Twilio)
 */
async function sendSMS(to, message) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log('Twilio not configured, skipping SMS');
      return { sent: false, error: 'SMS not configured' };
    }

    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to
    });

    return { sent: true, messageId: result.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * Send appointment confirmation
 */
async function sendAppointmentConfirmation(appointment) {
  const user = await User.findById(appointment.patientId);
  const { Doctor, Hospital } = require('../models');

  const doctor = await Doctor.findById(appointment.doctorId)
    .populate('userId', 'name');
  const hospital = await Hospital.findById(appointment.hospitalId);

  const formattedDate = new Date(appointment.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Email
  if (user.email && user.notificationPreferences?.email !== false) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Confirmed!</h2>
        <p>Dear ${user.name},</p>
        <p>Your appointment has been successfully booked.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Doctor:</strong> Dr. ${doctor.userId.name}</p>
          <p><strong>Specialty:</strong> ${doctor.specialty}</p>
          <p><strong>Hospital:</strong> ${hospital.name}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${appointment.slotTime}</p>
          ${appointment.queueNumber ? `<p><strong>Queue Number:</strong> ${appointment.queueNumber}</p>` : ''}
        </div>

        <p><strong>Important:</strong></p>
        <ul>
          <li>Please arrive 15 minutes before your appointment</li>
          <li>Bring any previous medical records</li>
          <li>You can check your queue status in the app</li>
        </ul>

        <p>Thank you for choosing MedQueue AI!</p>
      </div>
    `;

    const emailResult = await sendEmail(
      user.email,
      'Appointment Confirmed - MedQueue AI',
      emailHtml
    );

    // Update notification
    await Notification.findOneAndUpdate(
      { userId: user._id, appointmentId: appointment._id, type: 'appointment_booked' },
      { 'channels.email': { sent: emailResult.sent, sentAt: new Date(), status: emailResult.error || 'sent' } }
    );
  }

  // SMS
  if (user.phone && user.notificationPreferences?.sms !== false) {
    const smsMessage = `MedQueue AI: Appointment confirmed with Dr. ${doctor.userId.name} on ${formattedDate} at ${appointment.slotTime}. Queue #${appointment.queueNumber || 'TBD'}. Please arrive 15 mins early.`;

    const smsResult = await sendSMS(user.phone, smsMessage);

    await Notification.findOneAndUpdate(
      { userId: user._id, appointmentId: appointment._id, type: 'appointment_booked' },
      { 'channels.sms': { sent: smsResult.sent, sentAt: new Date(), status: smsResult.error || 'sent', messageId: smsResult.messageId } }
    );
  }
}

/**
 * Send appointment reminder (day before)
 */
async function sendAppointmentReminder(appointment) {
  const user = await User.findById(appointment.patientId);
  const { Doctor } = require('../models');
  const doctor = await Doctor.findById(appointment.doctorId)
    .populate('userId', 'name');

  const formattedDate = new Date(appointment.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Create notification
  await Notification.createAppointmentNotification(
    user._id,
    'appointment_reminder',
    appointment._id,
    {
      title: 'Appointment Tomorrow',
      message: `Reminder: You have an appointment with Dr. ${doctor.userId.name} tomorrow at ${appointment.slotTime}`
    }
  );

  // SMS reminder
  if (user.phone && user.notificationPreferences?.sms !== false) {
    const smsMessage = `MedQueue Reminder: Appointment with Dr. ${doctor.userId.name} tomorrow (${formattedDate}) at ${appointment.slotTime}. Reply CANCEL to cancel.`;
    await sendSMS(user.phone, smsMessage);
  }
}

/**
 * Send queue update notification
 */
async function sendQueueUpdate(patientId, appointmentId, position, waitTime) {
  const user = await User.findById(patientId);

  // In-app notification
  await Notification.createQueueNotification(
    patientId,
    'queue_update',
    appointmentId,
    { position, waitTime }
  );

  // Push notification if token exists
  if (user.fcmToken) {
    await sendPushNotification(user.fcmToken, {
      title: 'Queue Update',
      body: `Position: ${position} | Wait: ~${waitTime} mins`,
      data: { appointmentId: appointmentId.toString(), type: 'queue_update' }
    });
  }
}

/**
 * Send "your turn" notification
 */
async function sendYourTurnNotification(patientId, appointmentId) {
  const user = await User.findById(patientId);

  // In-app
  await Notification.createQueueNotification(
    patientId,
    'your_turn',
    appointmentId
  );

  // SMS
  if (user.phone) {
    await sendSMS(user.phone, 'MedQueue: It\'s your turn! Please proceed to the consultation room.');
  }

  // Push
  if (user.fcmToken) {
    await sendPushNotification(user.fcmToken, {
      title: "It's Your Turn!",
      body: 'Please proceed to the consultation room',
      data: { appointmentId: appointmentId.toString(), type: 'your_turn' }
    });
  }
}

/**
 * Send push notification (FCM)
 */
async function sendPushNotification(token, { title, body, data }) {
  // TODO: Implement FCM push notifications
  console.log('Push notification:', { token, title, body, data });
  return { sent: true };
}

/**
 * Send delay notification to all waiting patients
 */
async function sendDelayNotification(doctorId, delayMinutes, reason) {
  const { Queue } = require('../models');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await Queue.findOne({ doctorId, date: today });
  if (!queue) return;

  const waitingPatients = queue.entries.filter(e => e.status === 'waiting');

  for (const entry of waitingPatients) {
    await Notification.createQueueNotification(
      entry.patientId,
      'delay_notification',
      entry.appointmentId,
      { delay: delayMinutes, reason }
    );

    const user = await User.findById(entry.patientId);
    if (user.phone && user.notificationPreferences?.sms !== false) {
      await sendSMS(
        user.phone,
        `MedQueue: There's a ${delayMinutes} minute delay. ${reason ? `Reason: ${reason}` : ''} We apologize for the inconvenience.`
      );
    }
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendQueueUpdate,
  sendYourTurnNotification,
  sendDelayNotification
};

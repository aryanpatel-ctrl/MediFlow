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
 * Generate ICS calendar file content
 */
function generateICSFile(appointment, doctor, hospital, patient) {
  const appointmentDate = new Date(appointment.date);
  const [hours, minutes] = appointment.slotTime.split(':').map(Number);

  // Set appointment start time
  const startDate = new Date(appointmentDate);
  startDate.setHours(hours, minutes, 0, 0);

  // Set appointment end time (default 30 mins if no end time)
  const endDate = new Date(startDate);
  if (appointment.slotEndTime) {
    const [endHours, endMinutes] = appointment.slotEndTime.split(':').map(Number);
    endDate.setHours(endHours, endMinutes, 0, 0);
  } else {
    endDate.setMinutes(endDate.getMinutes() + 30);
  }

  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${appointment._id}@medqueue.ai`;
  const now = formatICSDate(new Date());
  const start = formatICSDate(startDate);
  const end = formatICSDate(endDate);

  const doctorName = doctor?.userId?.name || 'Doctor';
  const hospitalName = hospital?.name || 'Hospital';
  const hospitalAddress = hospital?.address ?
    `${hospital.address.street || ''}, ${hospital.address.city || ''}, ${hospital.address.state || ''}`.trim() :
    '';

  const description = [
    `Appointment with Dr. ${doctorName}`,
    doctor?.specialty ? `Specialty: ${doctor.specialty}` : '',
    appointment.appointmentType ? `Type: ${appointment.appointmentType}` : '',
    appointment.queueNumber ? `Queue Number: ${appointment.queueNumber}` : '',
    appointment.notes ? `Notes: ${appointment.notes}` : '',
    '',
    'Please arrive 15 minutes before your appointment.',
    'Bring any previous medical records.'
  ].filter(Boolean).join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedQueue AI//Appointment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Medical Appointment - Dr. ${doctorName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${hospitalName}${hospitalAddress ? ', ' + hospitalAddress : ''}`,
    `ORGANIZER;CN=${hospitalName}:mailto:${hospital?.email || process.env.EMAIL_USER}`,
    patient?.email ? `ATTENDEE;CN=${patient.name};RSVP=TRUE:mailto:${patient.email}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment Reminder - 1 hour',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment Reminder - 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return icsContent;
}

/**
 * Send email notification with optional attachments
 */
async function sendEmail(to, subject, html, attachments = []) {
  try {
    const emailTransporter = initializeTransporter();
    if (!emailTransporter) {
      console.log('Email not configured, skipping');
      return { sent: false, error: 'Email not configured' };
    }

    const mailOptions = {
      from: `"MedQueue AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await emailTransporter.sendMail(mailOptions);

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
 * Send appointment confirmation with .ics calendar file
 */
async function sendAppointmentConfirmation(appointment) {
  const user = await User.findById(appointment.patientId);
  const { Doctor, Hospital } = require('../models');

  const doctor = await Doctor.findById(appointment.doctorId)
    .populate('userId', 'name');
  const hospital = await Hospital.findById(appointment.hospitalId);

  if (!user) {
    console.log('User not found for appointment confirmation');
    return;
  }

  const formattedDate = new Date(appointment.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const doctorName = doctor?.userId?.name || 'Doctor';
  const hospitalName = hospital?.name || 'Hospital';

  // Email with .ics attachment
  if (user.email && user.notificationPreferences?.email !== false) {
    // Generate ICS file
    const icsContent = generateICSFile(appointment, doctor, hospital, user);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✓ Appointment Confirmed!</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 16px;">Dear ${user.name},</p>
          <p style="color: #374151; font-size: 16px;">Your appointment has been successfully booked. Please find the details below:</p>

          <div style="background: #f9fafb; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #0d9488;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Doctor</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">Dr. ${doctorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Specialty</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${doctor?.specialty || 'General'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Hospital</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${hospitalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${appointment.slotTime}</td>
              </tr>
              ${appointment.queueNumber ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Queue Number</td>
                <td style="padding: 8px 0; color: #0d9488; font-size: 18px; font-weight: 700;">#${appointment.queueNumber}</td>
              </tr>
              ` : ''}
              ${appointment.appointmentType ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${appointment.appointmentType}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>📎 Calendar Invite Attached</strong><br>
              Open the attached .ics file to add this appointment to your calendar (Google Calendar, Outlook, Apple Calendar).
            </p>
          </div>

          <p style="color: #374151; font-size: 14px;"><strong>Important Reminders:</strong></p>
          <ul style="color: #6b7280; font-size: 14px; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Please arrive <strong>15 minutes before</strong> your appointment</li>
            <li style="margin-bottom: 8px;">Bring any previous medical records or test reports</li>
            <li style="margin-bottom: 8px;">You can check your queue status in real-time via our app</li>
          </ul>

          ${hospital?.address ? `
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #374151; margin: 0 0 8px 0; font-size: 14px;"><strong>📍 Location</strong></p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              ${hospital.address.street ? hospital.address.street + ', ' : ''}
              ${hospital.address.city ? hospital.address.city + ', ' : ''}
              ${hospital.address.state || ''}
              ${hospital.address.pincode ? ' - ' + hospital.address.pincode : ''}
            </p>
          </div>
          ` : ''}
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            Thank you for choosing MedQueue AI!<br>
            Need help? Contact us at ${hospital?.phone || 'support@medqueue.ai'}
          </p>
        </div>
      </div>
    `;

    const attachments = [
      {
        filename: `appointment-${appointment._id}.ics`,
        content: icsContent,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST'
      }
    ];

    const emailResult = await sendEmail(
      user.email,
      `Appointment Confirmed - Dr. ${doctorName} on ${formattedDate}`,
      emailHtml,
      attachments
    );

    console.log(`Appointment confirmation email ${emailResult.sent ? 'sent' : 'failed'} to ${user.email}`);

    // Update notification record
    try {
      await Notification.findOneAndUpdate(
        { userId: user._id, appointmentId: appointment._id, type: 'appointment_booked' },
        { 'channels.email': { sent: emailResult.sent, sentAt: new Date(), status: emailResult.error || 'sent' } }
      );
    } catch (err) {
      // Notification record might not exist, that's OK
    }
  }

  // SMS
  if (user.phone && user.notificationPreferences?.sms !== false) {
    const smsMessage = `MedQueue AI: Appointment confirmed with Dr. ${doctorName} on ${formattedDate} at ${appointment.slotTime}. Queue #${appointment.queueNumber || 'TBD'}. Please arrive 15 mins early.`;

    const smsResult = await sendSMS(user.phone, smsMessage);

    try {
      await Notification.findOneAndUpdate(
        { userId: user._id, appointmentId: appointment._id, type: 'appointment_booked' },
        { 'channels.sms': { sent: smsResult.sent, sentAt: new Date(), status: smsResult.error || 'sent', messageId: smsResult.messageId } }
      );
    } catch (err) {
      // Notification record might not exist, that's OK
    }
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

/**
 * Send appointment cancellation email
 */
async function sendAppointmentCancellation(appointment, reason) {
  const user = await User.findById(appointment.patientId);
  const { Doctor, Hospital } = require('../models');

  const doctor = await Doctor.findById(appointment.doctorId)
    .populate('userId', 'name');
  const hospital = await Hospital.findById(appointment.hospitalId);

  if (!user) {
    console.log('User not found for cancellation notification');
    return;
  }

  const formattedDate = new Date(appointment.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const doctorName = doctor?.userId?.name || 'Doctor';
  const hospitalName = hospital?.name || 'Hospital';

  // Email
  if (user.email && user.notificationPreferences?.email !== false) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Cancelled</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 16px;">Dear ${user.name},</p>
          <p style="color: #374151; font-size: 16px;">Your appointment has been cancelled. Here are the details:</p>

          <div style="background: #fef2f2; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #ef4444;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Doctor</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">Dr. ${doctorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Hospital</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${hospitalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Original Date</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Original Time</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${appointment.slotTime}</td>
              </tr>
              ${reason ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason</td>
                <td style="padding: 8px 0; color: #991b1b; font-size: 14px;">${reason}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; margin: 0; font-size: 14px;">
              <strong>Need to rebook?</strong><br>
              You can book a new appointment through our app or website at any time.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            If you did not request this cancellation or have any questions, please contact us immediately.
          </p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            MedQueue AI - ${hospitalName}<br>
            Contact: ${hospital?.phone || 'support@medqueue.ai'}
          </p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail(
      user.email,
      `Appointment Cancelled - ${formattedDate}`,
      emailHtml
    );

    console.log(`Cancellation email ${emailResult.sent ? 'sent' : 'failed'} to ${user.email}`);
  }

  // SMS
  if (user.phone && user.notificationPreferences?.sms !== false) {
    const smsMessage = `MedQueue AI: Your appointment with Dr. ${doctorName} on ${formattedDate} at ${appointment.slotTime} has been cancelled. ${reason ? `Reason: ${reason}` : ''} Please rebook if needed.`;
    await sendSMS(user.phone, smsMessage);
  }
}

/**
 * Send appointment rescheduled email with new .ics file
 */
async function sendAppointmentRescheduled(oldAppointment, newAppointment, reason) {
  const user = await User.findById(newAppointment.patientId);
  const { Doctor, Hospital } = require('../models');

  const doctor = await Doctor.findById(newAppointment.doctorId)
    .populate('userId', 'name');
  const hospital = await Hospital.findById(newAppointment.hospitalId);

  if (!user) {
    console.log('User not found for reschedule notification');
    return;
  }

  const oldFormattedDate = new Date(oldAppointment.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const newFormattedDate = new Date(newAppointment.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const doctorName = doctor?.userId?.name || 'Doctor';
  const hospitalName = hospital?.name || 'Hospital';

  // Email with new .ics file
  if (user.email && user.notificationPreferences?.email !== false) {
    // Generate new ICS file
    const icsContent = generateICSFile(newAppointment, doctor, hospital, user);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Rescheduled</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 16px;">Dear ${user.name},</p>
          <p style="color: #374151; font-size: 16px;">Your appointment has been rescheduled. Please see the updated details below:</p>

          <!-- Old Appointment (Crossed out) -->
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; opacity: 0.7;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Previous Appointment</p>
            <p style="margin: 0; color: #9ca3af; font-size: 14px; text-decoration: line-through;">
              ${oldFormattedDate} at ${oldAppointment.slotTime}
            </p>
          </div>

          <!-- New Appointment -->
          <div style="background: #fef3c7; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #92400e; text-transform: uppercase; font-weight: 600;">New Appointment</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Doctor</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">Dr. ${doctorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Specialty</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${doctor?.specialty || 'General'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Hospital</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;">${hospitalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-size: 14px;">New Date</td>
                <td style="padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700;">${newFormattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-size: 14px;">New Time</td>
                <td style="padding: 8px 0; color: #111827; font-size: 16px; font-weight: 700;">${newAppointment.slotTime}</td>
              </tr>
              ${newAppointment.queueNumber ? `
              <tr>
                <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Queue Number</td>
                <td style="padding: 8px 0; color: #d97706; font-size: 18px; font-weight: 700;">#${newAppointment.queueNumber}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${reason ? `
          <div style="background: #f9fafb; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">
              <strong>Reason for rescheduling:</strong> ${reason}
            </p>
          </div>
          ` : ''}

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>📎 Updated Calendar Invite Attached</strong><br>
              Open the attached .ics file to update your calendar with the new appointment time.
            </p>
          </div>

          <p style="color: #374151; font-size: 14px;"><strong>Reminders:</strong></p>
          <ul style="color: #6b7280; font-size: 14px; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Please arrive <strong>15 minutes before</strong> your new appointment time</li>
            <li style="margin-bottom: 8px;">Bring any previous medical records or test reports</li>
          </ul>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            MedQueue AI - ${hospitalName}<br>
            Contact: ${hospital?.phone || 'support@medqueue.ai'}
          </p>
        </div>
      </div>
    `;

    const attachments = [
      {
        filename: `appointment-rescheduled-${newAppointment._id}.ics`,
        content: icsContent,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST'
      }
    ];

    const emailResult = await sendEmail(
      user.email,
      `Appointment Rescheduled - New Date: ${newFormattedDate}`,
      emailHtml,
      attachments
    );

    console.log(`Reschedule email ${emailResult.sent ? 'sent' : 'failed'} to ${user.email}`);
  }

  // SMS
  if (user.phone && user.notificationPreferences?.sms !== false) {
    const smsMessage = `MedQueue AI: Your appointment has been rescheduled. NEW: Dr. ${doctorName} on ${newFormattedDate} at ${newAppointment.slotTime}. Please arrive 15 mins early.`;
    await sendSMS(user.phone, smsMessage);
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentRescheduled,
  sendAppointmentReminder,
  sendQueueUpdate,
  sendYourTurnNotification,
  sendDelayNotification,
  generateICSFile
};

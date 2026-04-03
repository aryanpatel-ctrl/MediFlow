const { google } = require('googleapis');
const { Hospital } = require('../models');

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5002/api/hospitals/google/callback';

// Scopes required for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for Google Calendar
 * @param {string} hospitalId - Hospital ID to include in state
 * @returns {string} Authorization URL
 */
function getAuthUrl(hospitalId) {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Always show consent screen to get refresh token
    state: hospitalId // Pass hospital ID to callback
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 * @returns {Object} Tokens { access_token, refresh_token, expiry_date }
 */
async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New tokens
 */
async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

/**
 * Get OAuth2 client with hospital's tokens
 * @param {Object} hospital - Hospital document
 * @returns {OAuth2Client} Authenticated client
 */
async function getAuthenticatedClient(hospital) {
  const tokens = hospital.getGoogleTokens();
  if (!tokens) {
    throw new Error('Hospital has not connected Google Calendar');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken
  });

  // Check if token is expired and refresh if needed
  if (hospital.isGoogleTokenExpired()) {
    try {
      const newCredentials = await refreshAccessToken(tokens.refreshToken);
      hospital.setGoogleTokens(
        newCredentials.access_token,
        tokens.refreshToken, // Keep the same refresh token
        new Date(newCredentials.expiry_date)
      );
      await hospital.save();

      oauth2Client.setCredentials({
        access_token: newCredentials.access_token,
        refresh_token: tokens.refreshToken
      });
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Google Calendar token expired. Please reconnect.');
    }
  }

  return oauth2Client;
}

/**
 * List user's calendars
 * @param {Object} hospital - Hospital document
 * @returns {Array} List of calendars
 */
async function listCalendars(hospital) {
  const auth = await getAuthenticatedClient(hospital);
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.calendarList.list();
  return response.data.items.map(cal => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false
  }));
}

/**
 * Create calendar event for appointment
 * @param {Object} hospital - Hospital document
 * @param {Object} appointmentData - Appointment details
 * @returns {Object} Created event
 */
async function createAppointmentEvent(hospital, appointmentData) {
  const auth = await getAuthenticatedClient(hospital);
  const calendar = google.calendar({ version: 'v3', auth });

  const {
    patientName,
    patientEmail,
    patientPhone,
    doctorName,
    specialty,
    date,
    slotTime,
    slotEndTime,
    triageSummary,
    hospitalName,
    hospitalAddress
  } = appointmentData;

  // Parse date and time
  const [year, month, day] = date.split('-').map(Number);
  const [startHour, startMin] = slotTime.split(':').map(Number);
  const [endHour, endMin] = slotEndTime.split(':').map(Number);

  const startDateTime = new Date(year, month - 1, day, startHour, startMin);
  const endDateTime = new Date(year, month - 1, day, endHour, endMin);

  // Build event description
  let description = `Appointment at ${hospitalName}\n\n`;
  description += `Patient: ${patientName}\n`;
  description += `Phone: ${patientPhone}\n\n`;
  description += `Doctor: ${doctorName}\n`;
  description += `Specialty: ${specialty}\n\n`;

  if (triageSummary) {
    description += `--- AI Pre-Visit Summary ---\n`;
    description += triageSummary + '\n';
  }

  const event = {
    summary: `Medical Appointment - ${doctorName} (${specialty})`,
    description,
    location: hospitalAddress,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Asia/Kolkata'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Asia/Kolkata'
    },
    attendees: patientEmail ? [{ email: patientEmail }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 30 }       // 30 minutes before
      ]
    },
    colorId: '9' // Blue color for medical appointments
  };

  const calendarId = hospital.googleCalendar.calendarId || 'primary';

  const response = await calendar.events.insert({
    calendarId,
    resource: event,
    sendUpdates: patientEmail ? 'all' : 'none' // Send invite if email provided
  });

  return {
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
    status: response.data.status
  };
}

/**
 * Update calendar event for appointment
 * @param {Object} hospital - Hospital document
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated event
 */
async function updateAppointmentEvent(hospital, eventId, updates) {
  const auth = await getAuthenticatedClient(hospital);
  const calendar = google.calendar({ version: 'v3', auth });

  const calendarId = hospital.googleCalendar.calendarId || 'primary';

  // First get the existing event
  const existingEvent = await calendar.events.get({
    calendarId,
    eventId
  });

  // Merge updates
  const updatedEvent = {
    ...existingEvent.data,
    ...updates
  };

  const response = await calendar.events.update({
    calendarId,
    eventId,
    resource: updatedEvent,
    sendUpdates: 'all'
  });

  return {
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
    status: response.data.status
  };
}

/**
 * Delete/Cancel calendar event
 * @param {Object} hospital - Hospital document
 * @param {string} eventId - Google Calendar event ID
 */
async function deleteAppointmentEvent(hospital, eventId) {
  const auth = await getAuthenticatedClient(hospital);
  const calendar = google.calendar({ version: 'v3', auth });

  const calendarId = hospital.googleCalendar.calendarId || 'primary';

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: 'all'
  });

  return { success: true };
}

/**
 * Check if Google Calendar is configured
 */
function isConfigured() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken,
  getAuthenticatedClient,
  listCalendars,
  createAppointmentEvent,
  updateAppointmentEvent,
  deleteAppointmentEvent,
  isConfigured
};

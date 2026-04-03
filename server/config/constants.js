// Medical Specialties
const SPECIALTIES = [
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology',
  'Dermatology',
  'ENT',
  'Ophthalmology',
  'Gastroenterology',
  'Pulmonology',
  'Psychiatry',
  'Urology',
  'Nephrology',
  'Oncology',
  'Emergency',
  'Dental'
];

// User Roles
const ROLES = {
  HOSPITAL_ADMIN: 'hospital_admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient'
};

// Appointment Status
const APPOINTMENT_STATUS = {
  BOOKED: 'booked',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled'
};

// Queue Status
const QUEUE_STATUS = {
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed'
};

// Booking Source
const BOOKING_SOURCE = {
  WEB_CHAT: 'web_chat',
  VOICE_CALL: 'voice_call',
  MANUAL: 'manual',
  WALK_IN: 'walk_in',
  RESCHEDULE: 'reschedule'
};

// Days of week
const DAYS_OF_WEEK = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];

// Urgency Labels
const URGENCY_LABELS = {
  1: 'Routine',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Emergency'
};

// Urgency Colors (for frontend)
const URGENCY_COLORS = {
  1: '#10b981', // green
  2: '#3b82f6', // blue
  3: '#f59e0b', // yellow
  4: '#f97316', // orange
  5: '#ef4444'  // red
};

module.exports = {
  SPECIALTIES,
  ROLES,
  APPOINTMENT_STATUS,
  QUEUE_STATUS,
  BOOKING_SOURCE,
  DAYS_OF_WEEK,
  URGENCY_LABELS,
  URGENCY_COLORS
};

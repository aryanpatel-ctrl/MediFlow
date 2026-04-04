const express = require('express');
const router = express.Router();
const { Hospital, User, Doctor } = require('../models');
const { protect, authorize, optionalAuth, asyncHandler, AppError, generateToken } = require('../middleware');
const calendarService = require('../services/calendarService');

// ========================================
// HOSPITAL ONBOARDING ROUTES
// ========================================

// @route   POST /api/hospitals/onboard
// @desc    Complete hospital onboarding (all steps at once)
// @access  Public (self-registration)
router.post('/onboard', asyncHandler(async (req, res) => {
  const {
    // Step 1: Basic Details
    name,
    type,
    registrationNumber,
    email,
    phone,
    website,
    address,
    logo,
    // Step 2: Operations
    operatingHours,
    emergency24x7,
    specialties,
    appointmentTypes,
    inventoryCategories,
    // Step 3: Configuration
    defaultSlotDuration,
    maxPatientsPerSlot,
    queueSettings,
    features,
    emergencySlotsPerDoctor,
    // Step 4: Admin Account
    adminName,
    adminEmail,
    adminPhone,
    adminPassword
  } = req.body;

  // Check if hospital email already exists
  const existingHospital = await Hospital.findOne({ email });
  if (existingHospital) {
    throw new AppError('A hospital with this email already exists', 400);
  }

  // Check if admin email already exists
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    throw new AppError('An account with this admin email already exists', 400);
  }

  // Create hospital admin user first
  const adminUser = await User.create({
    name: adminName,
    email: adminEmail,
    phone: adminPhone,
    password: adminPassword,
    role: 'hospital_admin',
    isVerified: true // Auto-verify for hackathon
  });

  // Create hospital
  const hospital = await Hospital.create({
    name,
    type: type || 'private',
    registrationNumber,
    email,
    phone,
    website,
    address,
    logo,
    operatingHours: operatingHours || {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '14:00', isOpen: true },
      sunday: { open: '', close: '', isOpen: false }
    },
    emergency24x7: emergency24x7 || false,
    specialties: specialties || ['General Medicine'],
    appointmentTypes: appointmentTypes || ['Consultation', 'Follow-up', 'Surgery', 'Telemedicine'],
    inventoryCategories: inventoryCategories || ['Medicines', 'Equipment', 'Supplies'],
    defaultSlotDuration: defaultSlotDuration || 15,
    maxPatientsPerSlot: maxPatientsPerSlot || 1,
    queueSettings: queueSettings || {},
    features: features || {
      aiChatbotEnabled: true,
      smsNotificationsEnabled: true,
      emailNotificationsEnabled: true
    },
    emergencySlotsPerDoctor: emergencySlotsPerDoctor || 3,
    adminId: adminUser._id,
    onboardingStep: 4,
    onboardingComplete: true,
    isVerified: true // Auto-verify for hackathon
  });

  // Update admin with hospital reference
  adminUser.hospitalId = hospital._id;
  await adminUser.save();

  // Generate token for auto-login
  const token = generateToken(adminUser._id);

  res.status(201).json({
    success: true,
    message: 'Hospital onboarded successfully',
    hospital: {
      _id: hospital._id,
      name: hospital.name,
      slug: hospital.slug,
      email: hospital.email,
      googleCalendarConnected: hospital.googleCalendar?.connected || false
    },
    admin: {
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role
    },
    token
  });
}));

// @route   PUT /api/hospitals/:id/onboard/step
// @desc    Save onboarding step data (for step-by-step flow)
// @access  Private/HospitalAdmin
router.put('/:id/onboard/step', protect, asyncHandler(async (req, res) => {
  const { step, data } = req.body;

  const hospital = await Hospital.findById(req.params.id);
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  // Update fields based on step
  switch (step) {
    case 1: // Basic Details
      Object.assign(hospital, {
        name: data.name,
        type: data.type,
        registrationNumber: data.registrationNumber,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        logo: data.logo
      });
      break;
    case 2: // Operations
      Object.assign(hospital, {
        operatingHours: data.operatingHours,
        emergency24x7: data.emergency24x7,
        specialties: data.specialties,
        appointmentTypes: data.appointmentTypes,
        inventoryCategories: data.inventoryCategories
      });
      break;
    case 3: // Configuration
      Object.assign(hospital, {
        defaultSlotDuration: data.defaultSlotDuration,
        maxPatientsPerSlot: data.maxPatientsPerSlot,
        queueSettings: data.queueSettings,
        features: data.features,
        emergencySlotsPerDoctor: data.emergencySlotsPerDoctor
      });
      break;
    case 4: // Complete
      hospital.onboardingComplete = true;
      break;
  }

  hospital.onboardingStep = step;
  await hospital.save();

  res.status(200).json({
    success: true,
    message: `Step ${step} saved successfully`,
    hospital
  });
}));

// ========================================
// GOOGLE CALENDAR OAUTH ROUTES
// ========================================

// @route   GET /api/hospitals/:id/google/auth
// @desc    Get Google Calendar authorization URL
// @access  Private/HospitalAdmin
router.get('/:id/google/auth', protect, asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  // Verify authorization
  if (req.user.role === 'hospital_admin' &&
      hospital.adminId?.toString() !== req.user.id) {
    throw new AppError('Not authorized', 403);
  }

  if (!calendarService.isConfigured()) {
    throw new AppError('Google Calendar is not configured on this server', 500);
  }

  const authUrl = calendarService.getAuthUrl(hospital._id.toString());

  res.status(200).json({
    success: true,
    authUrl
  });
}));

// @route   GET /api/hospitals/google/callback
// @desc    Google OAuth callback
// @access  Public (Google redirects here)
router.get('/google/callback', asyncHandler(async (req, res) => {
  const { code, state: hospitalId, error } = req.query;

  if (error) {
    // Redirect to frontend with error
    return res.redirect(`${process.env.CLIENT_URL}/settings?google_error=${error}`);
  }

  if (!code || !hospitalId) {
    return res.redirect(`${process.env.CLIENT_URL}/settings?google_error=missing_params`);
  }

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.redirect(`${process.env.CLIENT_URL}/settings?google_error=hospital_not_found`);
    }

    // Exchange code for tokens
    const tokens = await calendarService.getTokensFromCode(code);

    // Save tokens to hospital using findByIdAndUpdate to avoid full validation
    const crypto = require('crypto');
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
    const IV_LENGTH = 16;

    function encrypt(text) {
      if (!text) return null;
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
      let encrypted = cipher.update(text);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    await Hospital.findByIdAndUpdate(hospitalId, {
      'googleCalendar.accessToken': encrypt(tokens.access_token),
      'googleCalendar.refreshToken': encrypt(tokens.refresh_token),
      'googleCalendar.tokenExpiry': new Date(tokens.expiry_date),
      'googleCalendar.connected': true,
      'googleCalendar.connectedAt': new Date(),
      'features.googleCalendarEnabled': true
    });

    // Redirect to frontend with success
    res.redirect(`${process.env.CLIENT_URL}/settings?google_connected=true`);
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    res.redirect(`${process.env.CLIENT_URL}/settings?google_error=token_exchange_failed`);
  }
}));

// @route   GET /api/hospitals/:id/google/calendars
// @desc    List available Google Calendars
// @access  Private/HospitalAdmin
router.get('/:id/google/calendars', protect, asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  if (!hospital.googleCalendar?.connected) {
    throw new AppError('Google Calendar is not connected', 400);
  }

  const calendars = await calendarService.listCalendars(hospital);

  res.status(200).json({
    success: true,
    calendars
  });
}));

// @route   PUT /api/hospitals/:id/google/calendar
// @desc    Set which calendar to use for appointments
// @access  Private/HospitalAdmin
router.put('/:id/google/calendar', protect, asyncHandler(async (req, res) => {
  const { calendarId } = req.body;

  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  if (!hospital.googleCalendar?.connected) {
    throw new AppError('Google Calendar is not connected', 400);
  }

  hospital.googleCalendar.calendarId = calendarId;
  await hospital.save();

  res.status(200).json({
    success: true,
    message: 'Calendar selected successfully',
    calendarId
  });
}));

// @route   DELETE /api/hospitals/:id/google/disconnect
// @desc    Disconnect Google Calendar
// @access  Private/HospitalAdmin
router.delete('/:id/google/disconnect', protect, asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  hospital.disconnectGoogleCalendar();
  await hospital.save();

  res.status(200).json({
    success: true,
    message: 'Google Calendar disconnected'
  });
}));

// @route   GET /api/hospitals/:id/google/status
// @desc    Check Google Calendar connection status
// @access  Private/HospitalAdmin
router.get('/:id/google/status', protect, asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  res.status(200).json({
    success: true,
    googleCalendar: {
      configured: calendarService.isConfigured(),
      connected: hospital.googleCalendar?.connected || false,
      calendarId: hospital.googleCalendar?.calendarId || null,
      connectedAt: hospital.googleCalendar?.connectedAt || null
    }
  });
}));

// @route   GET /api/hospitals
// @desc    Get all hospitals
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const { city, specialty, page = 1, limit = 10 } = req.query;

  const query = { isActive: true };

  if (city) {
    query['address.city'] = new RegExp(city, 'i');
  }

  if (specialty) {
    query.specialties = specialty;
  }

  const hospitals = await Hospital.find(query)
    .select('name slug address specialties operatingHours logo avgWaitTime totalDoctors')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Hospital.countDocuments(query);

  res.status(200).json({
    success: true,
    count: hospitals.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    hospitals
  });
}));

// @route   GET /api/hospitals/:id
// @desc    Get hospital by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id)
    .populate('adminId', 'name email phone');

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  // Get doctors count by specialty
  const doctorStats = await Doctor.aggregate([
    { $match: { hospitalId: hospital._id, isActive: true } },
    { $group: { _id: '$specialty', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    success: true,
    hospital,
    doctorStats
  });
}));

// @route   PUT /api/hospitals/:id
// @desc    Update hospital
// @access  Private/HospitalAdmin
router.put('/:id', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  let hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  // Check authorization
  if (req.user.role === 'hospital_admin' &&
      hospital.adminId.toString() !== req.user.id) {
    throw new AppError('Not authorized to update this hospital', 403);
  }

  const allowedFields = [
    'name', 'type', 'phone', 'website', 'address', 'specialties', 'appointmentTypes',
    'inventoryCategories', 'operatingHours',
    'defaultSlotDuration', 'maxPatientsPerSlot', 'queueSettings', 'features',
    'logo', 'primaryColor', 'emergency24x7', 'emergencySlotsPerDoctor'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  hospital = await Hospital.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    hospital
  });
}));

// @route   GET /api/hospitals/:id/doctors
// @desc    Get all doctors of a hospital
// @access  Public
router.get('/:id/doctors', asyncHandler(async (req, res) => {
  const { specialty, available } = req.query;

  const query = { hospitalId: req.params.id, isActive: true };

  if (specialty) {
    query.specialty = specialty;
  }

  if (available === 'true') {
    query.isAcceptingPatients = true;
  }

  const doctors = await Doctor.find(query)
    .populate('userId', 'name email phone')
    .select('specialty qualification experience consultationFee rating slotDuration');

  res.status(200).json({
    success: true,
    count: doctors.length,
    doctors
  });
}));

// @route   GET /api/hospitals/:id/stats
// @desc    Get hospital statistics
// @access  Private/HospitalAdmin
router.get('/:id/stats', protect, authorize('hospital_admin'), asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);

  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Aggregate appointment stats
  const { Appointment } = require('../models');

  const stats = await Appointment.aggregate([
    {
      $match: {
        hospitalId: hospital._id,
        date: { $gte: today, $lt: tomorrow }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const appointmentStats = {
    total: 0,
    booked: 0,
    checked_in: 0,
    completed: 0,
    no_show: 0,
    cancelled: 0
  };

  stats.forEach(s => {
    appointmentStats[s._id] = s.count;
    appointmentStats.total += s.count;
  });

  // Get doctor count
  const doctorCount = await Doctor.countDocuments({
    hospitalId: hospital._id,
    isActive: true
  });

  res.status(200).json({
    success: true,
    stats: {
      appointments: appointmentStats,
      doctors: doctorCount,
      avgWaitTime: hospital.avgWaitTime
    }
  });
}));

module.exports = router;

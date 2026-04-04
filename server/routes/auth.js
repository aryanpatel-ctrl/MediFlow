const express = require('express');
const router = express.Router();
const { User, OTP, Hospital } = require('../models');
const { protect, generateToken, asyncHandler, AppError } = require('../middleware');

async function ensurePatientHospital(user) {
  if (!user || user.role !== 'patient' || user.hospitalId) {
    return user;
  }

  const defaultHospital = await Hospital.findOne({ isActive: true }).select('_id name slug');
  if (!defaultHospital) {
    return user;
  }

  user.hospitalId = defaultHospital._id;
  await user.save();
  await user.populate('hospitalId', 'name slug');

  return user;
}

// @route   POST /api/auth/send-otp
// @desc    Send OTP for registration/login
// @access  Public
router.post('/send-otp', asyncHandler(async (req, res) => {
  const { phone, purpose = 'registration' } = req.body;

  if (!phone) {
    throw new AppError('Phone number is required', 400);
  }

  // Check rate limiting
  const canResend = await OTP.canResend(phone, purpose);
  if (!canResend.canResend) {
    throw new AppError(canResend.error || `Please wait ${canResend.waitTime} seconds`, 429);
  }

  // Create OTP
  const otp = await OTP.createOTP(phone, purpose);

  // TODO: Send OTP via SMS (Twilio)
  console.log(`OTP for ${phone}: ${otp.code}`); // For development

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    // Remove in production
    ...(process.env.NODE_ENV === 'development' && { otp: otp.code })
  });
}));

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { phone, code, purpose = 'registration' } = req.body;

  if (!phone || !code) {
    throw new AppError('Phone and OTP code are required', 400);
  }

  const result = await OTP.verifyOTP(phone, code, purpose);

  if (!result.success) {
    throw new AppError(result.error, 400);
  }

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    verified: true
  });
}));

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password, dateOfBirth, gender } = req.body;

  // Check if OTP was verified
  const verifiedOTP = await OTP.findOne({
    phone,
    purpose: 'registration',
    isVerified: true,
    verifiedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Within last 10 minutes
  });

  if (!verifiedOTP) {
    throw new AppError('Please verify your phone number first', 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    throw new AppError('User already exists with this email or phone', 400);
  }

  // Create user
  let user = await User.create({
    name,
    email,
    phone,
    password,
    dateOfBirth,
    gender,
    isVerified: true,
    role: 'patient'
  });

  user = await ensurePatientHospital(user);

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hospitalId: user.hospitalId
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Find user
  let user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  user = await ensurePatientHospital(user);

  // Generate token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hospitalId: user.hospitalId
    }
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, asyncHandler(async (req, res) => {
  let user = await User.findById(req.user.id).populate('hospitalId', 'name slug');
  user = await ensurePatientHospital(user);

  res.status(200).json({
    success: true,
    user
  });
}));

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const allowedFields = [
    'name', 'dateOfBirth', 'gender', 'address',
    'medicalHistory', 'allergies', 'emergencyContact',
    'preferredLanguage', 'notificationPreferences'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    user
  });
}));

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
}));

module.exports = router;

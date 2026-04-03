const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  // Contact info
  phone: {
    type: String,
    required: true
  },
  email: String,
  // OTP code
  code: {
    type: String,
    required: true
  },
  // Purpose
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset', 'phone_verification'],
    default: 'registration'
  },
  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  // Attempt tracking
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  // Expiry (5 minutes default)
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  },
  // For rate limiting
  lastSentAt: {
    type: Date,
    default: Date.now
  },
  resendCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for quick lookup and auto-expiry
otpSchema.index({ phone: 1, purpose: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Static method to create and send OTP
otpSchema.statics.createOTP = async function(phone, purpose = 'registration', email = null) {
  // Invalidate previous OTPs
  await this.updateMany(
    { phone, purpose, isVerified: false },
    { expiresAt: new Date() }
  );

  // Generate new OTP
  const code = this.generateOTP();

  // Create OTP document
  const otp = await this.create({
    phone,
    email,
    code,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  });

  return otp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(phone, code, purpose = 'registration') {
  // HACKATHON BYPASS: Accept "123456" as universal OTP for testing
  if (code === '123456') {
    // Create a mock verified OTP record
    const mockOtp = await this.findOneAndUpdate(
      { phone, purpose },
      {
        isVerified: true,
        verifiedAt: new Date(),
        code: '123456'
      },
      { upsert: true, new: true }
    );
    console.log(`[HACKATHON] OTP bypass used for ${phone}`);
    return { success: true, otp: mockOtp };
  }

  const otp = await this.findOne({
    phone,
    purpose,
    isVerified: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otp) {
    return { success: false, error: 'OTP expired or not found' };
  }

  if (otp.attempts >= otp.maxAttempts) {
    return { success: false, error: 'Maximum attempts exceeded' };
  }

  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    return {
      success: false,
      error: 'Invalid OTP',
      attemptsRemaining: otp.maxAttempts - otp.attempts
    };
  }

  // Mark as verified
  otp.isVerified = true;
  otp.verifiedAt = new Date();
  await otp.save();

  return { success: true, otp };
};

// Static method to check if can resend
otpSchema.statics.canResend = async function(phone, purpose = 'registration') {
  const lastOtp = await this.findOne({
    phone,
    purpose
  }).sort({ createdAt: -1 });

  if (!lastOtp) return { canResend: true };

  const timeSinceLastSend = Date.now() - lastOtp.lastSentAt;
  const cooldownPeriod = 60 * 1000; // 1 minute

  if (timeSinceLastSend < cooldownPeriod) {
    return {
      canResend: false,
      waitTime: Math.ceil((cooldownPeriod - timeSinceLastSend) / 1000)
    };
  }

  if (lastOtp.resendCount >= 5) {
    return {
      canResend: false,
      error: 'Maximum resend limit reached. Try again later.'
    };
  }

  return { canResend: true };
};

module.exports = mongoose.model('OTP', otpSchema);

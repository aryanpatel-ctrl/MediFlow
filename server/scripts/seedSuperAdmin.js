/**
 * Seed Super Admin User
 * Run: node scripts/seedSuperAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medqueue')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// User Schema (inline to avoid model conflicts)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  role: {
    type: String,
    enum: ['patient', 'doctor', 'hospital_admin', 'super_admin'],
    default: 'patient'
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedSuperAdmin() {
  try {
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'super_admin' });

    if (existingAdmin) {
      console.log('Super Admin already exists:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log('  Password: (use existing password)');
      process.exit(0);
    }

    // Create super admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('superadmin123', salt);

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@medqueue.ai',
      phone: '+91 9999999999',
      password: hashedPassword,
      role: 'super_admin',
      isVerified: true,
      isActive: true
    });

    console.log('\n✅ Super Admin Created Successfully!');
    console.log('=====================================');
    console.log('  Email:    admin@medqueue.ai');
    console.log('  Password: superadmin123');
    console.log('  Role:     super_admin');
    console.log('=====================================');
    console.log('\nUse these credentials to login and add hospitals.\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();

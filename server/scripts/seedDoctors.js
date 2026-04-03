const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const { User, Doctor, Hospital } = require('../models');

// MONGODB_URI is required from environment variables
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

const doctors = [
  {
    name: 'Dr. Rajesh Kumar',
    email: 'dr.rajesh@mediflow.ai',
    phone: '+91 9876543201',
    specialty: 'General Medicine',
    qualification: 'MBBS, MD',
    registrationNumber: 'MH-12345',
    experience: 12,
    consultationFee: 500,
    slotDuration: 15,
    languages: ['Hindi', 'English'],
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'dr.priya@mediflow.ai',
    phone: '+91 9876543202',
    specialty: 'Cardiology',
    qualification: 'MBBS, DM Cardiology',
    registrationNumber: 'MH-12346',
    experience: 15,
    consultationFee: 1000,
    slotDuration: 20,
    languages: ['Hindi', 'English'],
  },
  {
    name: 'Dr. Amit Patel',
    email: 'dr.amit@mediflow.ai',
    phone: '+91 9876543203',
    specialty: 'Neurology',
    qualification: 'MBBS, DM Neurology',
    registrationNumber: 'MH-12347',
    experience: 10,
    consultationFee: 800,
    slotDuration: 20,
    languages: ['Hindi', 'English', 'Gujarati'],
  },
  {
    name: 'Dr. Sneha Reddy',
    email: 'dr.sneha@mediflow.ai',
    phone: '+91 9876543204',
    specialty: 'Dermatology',
    qualification: 'MBBS, MD Dermatology',
    registrationNumber: 'MH-12348',
    experience: 8,
    consultationFee: 600,
    slotDuration: 15,
    languages: ['Hindi', 'English', 'Telugu'],
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'dr.vikram@mediflow.ai',
    phone: '+91 9876543205',
    specialty: 'Orthopedics',
    qualification: 'MBBS, MS Ortho',
    registrationNumber: 'MH-12349',
    experience: 18,
    consultationFee: 700,
    slotDuration: 15,
    languages: ['Hindi', 'English', 'Punjabi'],
  },
  {
    name: 'Dr. Ananya Gupta',
    email: 'dr.ananya@mediflow.ai',
    phone: '+91 9876543206',
    specialty: 'Pediatrics',
    qualification: 'MBBS, MD Pediatrics',
    registrationNumber: 'MH-12350',
    experience: 9,
    consultationFee: 500,
    slotDuration: 15,
    languages: ['Hindi', 'English'],
  },
  {
    name: 'Dr. Mohammed Khan',
    email: 'dr.khan@mediflow.ai',
    phone: '+91 9876543207',
    specialty: 'ENT',
    qualification: 'MBBS, MS ENT',
    registrationNumber: 'MH-12351',
    experience: 11,
    consultationFee: 550,
    slotDuration: 15,
    languages: ['Hindi', 'English', 'Urdu'],
  },
  {
    name: 'Dr. Lakshmi Iyer',
    email: 'dr.lakshmi@mediflow.ai',
    phone: '+91 9876543208',
    specialty: 'Gastroenterology',
    qualification: 'MBBS, DM Gastro',
    registrationNumber: 'MH-12352',
    experience: 14,
    consultationFee: 900,
    slotDuration: 20,
    languages: ['Hindi', 'English', 'Tamil'],
  },
  {
    name: 'Dr. Arun Mehta',
    email: 'dr.arun@mediflow.ai',
    phone: '+91 9876543209',
    specialty: 'Psychiatry',
    qualification: 'MBBS, MD Psychiatry',
    registrationNumber: 'MH-12353',
    experience: 7,
    consultationFee: 800,
    slotDuration: 30,
    languages: ['Hindi', 'English'],
  },
  {
    name: 'Dr. Kavitha Nair',
    email: 'dr.kavitha@mediflow.ai',
    phone: '+91 9876543210',
    specialty: 'Gynecology',
    qualification: 'MBBS, MS OBG',
    registrationNumber: 'MH-12354',
    experience: 13,
    consultationFee: 700,
    slotDuration: 20,
    languages: ['Hindi', 'English', 'Malayalam'],
  },
];

const availability = {
  monday: {
    isAvailable: true,
    slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '17:00' }]
  },
  tuesday: {
    isAvailable: true,
    slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '17:00' }]
  },
  wednesday: {
    isAvailable: true,
    slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '17:00' }]
  },
  thursday: {
    isAvailable: true,
    slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '17:00' }]
  },
  friday: {
    isAvailable: true,
    slots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '17:00' }]
  },
  saturday: {
    isAvailable: true,
    slots: [{ startTime: '10:00', endTime: '14:00' }]
  },
  sunday: {
    isAvailable: false,
    slots: []
  }
};

async function seedDoctors() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create or find hospital admin
    let hospitalAdmin = await User.findOne({ email: 'admin@medqueue-demo.com' });

    if (!hospitalAdmin) {
      hospitalAdmin = await User.create({
        name: 'Hospital Admin',
        email: 'admin@medqueue-demo.com',
        phone: '+91 9876543200',
        password: hashedPassword,
        role: 'hospital_admin',
        isVerified: true,
      });
      console.log('Created hospital admin user');
    }

    // Create or find hospital
    let hospital = await Hospital.findOne({ name: 'MediFlow Demo Hospital' });

    if (!hospital) {
      hospital = await Hospital.create({
        name: 'MediFlow Demo Hospital',
        email: 'contact@medqueue-demo.com',
        phone: '+91 22 12345678',
        adminId: hospitalAdmin._id,
        address: {
          street: '123 Healthcare Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        specialties: [
          'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
          'Pediatrics', 'Gynecology', 'Dermatology', 'ENT', 'Gastroenterology', 'Psychiatry'
        ],
        operatingHours: {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '10:00', close: '14:00', isOpen: true },
          sunday: { open: '', close: '', isOpen: false },
        },
        defaultSlotDuration: 15,
        isActive: true,
        isVerified: true,
      });
      console.log('Created demo hospital');

      // Update admin with hospital reference
      hospitalAdmin.hospitalId = hospital._id;
      await hospitalAdmin.save();
    }

    // Hash password for doctors
    const doctorPassword = await bcrypt.hash('doctor123', 10);

    for (const doc of doctors) {
      // Check if doctor already exists
      const existingUser = await User.findOne({ email: doc.email });
      if (existingUser) {
        // Update existing doctor's availability to correct format
        const existingDoctor = await Doctor.findOne({ userId: existingUser._id });
        if (existingDoctor) {
          existingDoctor.availability = availability;
          await existingDoctor.save();
          console.log(`Updated availability for ${doc.name}`);
        }
        continue;
      }

      // Create user
      const user = await User.create({
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        password: doctorPassword,
        role: 'doctor',
        hospitalId: hospital._id,
        isVerified: true,
      });

      // Create doctor profile
      await Doctor.create({
        userId: user._id,
        hospitalId: hospital._id,
        specialty: doc.specialty,
        qualification: doc.qualification,
        registrationNumber: doc.registrationNumber,
        experience: doc.experience,
        consultationFee: doc.consultationFee,
        slotDuration: doc.slotDuration,
        languages: doc.languages,
        availability,
        isActive: true,
        isAcceptingPatients: true,
        rating: {
          average: (4 + Math.random()).toFixed(1),
          count: Math.floor(Math.random() * 100) + 50,
        },
      });

      console.log(`Created doctor: ${doc.name} (${doc.specialty})`);
    }

    // Update hospital doctor count
    await Hospital.findByIdAndUpdate(hospital._id, {
      totalDoctors: await Doctor.countDocuments({ hospitalId: hospital._id }),
    });

    console.log('\n✅ Seed completed successfully!');
    console.log(`Hospital: ${hospital.name}`);
    console.log(`Total doctors: ${doctors.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedDoctors();

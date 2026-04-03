require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Hospital, Doctor } = require('../models');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Hospital.deleteMany({});
    await Doctor.deleteMany({});
    console.log('Cleared existing data');

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@mediflow.ai',
      phone: '+911234567890',
      password: 'admin123',
      role: 'super_admin',
      isVerified: true
    });
    console.log('Created Super Admin');

    // Create Hospital Admin
    const hospitalAdmin = await User.create({
      name: 'City Hospital Admin',
      email: 'cityhospital@mediflow.ai',
      phone: '+911234567891',
      password: 'hospital123',
      role: 'hospital_admin',
      isVerified: true
    });

    // Create Hospital
    const hospital = await Hospital.create({
      name: 'City General Hospital',
      email: 'info@cityhospital.com',
      phone: '+911234567800',
      address: {
        street: '123 Medical Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      adminId: hospitalAdmin._id,
      specialties: [
        'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics',
        'Pediatrics', 'Dermatology', 'ENT', 'Ophthalmology'
      ],
      operatingHours: {
        monday: { open: '08:00', close: '20:00', isOpen: true },
        tuesday: { open: '08:00', close: '20:00', isOpen: true },
        wednesday: { open: '08:00', close: '20:00', isOpen: true },
        thursday: { open: '08:00', close: '20:00', isOpen: true },
        friday: { open: '08:00', close: '20:00', isOpen: true },
        saturday: { open: '09:00', close: '14:00', isOpen: true },
        sunday: { open: '00:00', close: '00:00', isOpen: false }
      },
      isVerified: true,
      isActive: true
    });

    hospitalAdmin.hospitalId = hospital._id;
    await hospitalAdmin.save();
    console.log('Created Hospital');

    // Create Doctors
    const doctorsData = [
      {
        name: 'Dr. Rajesh Sharma',
        email: 'dr.rajesh@cityhospital.com',
        phone: '+911234567801',
        specialty: 'General Medicine',
        qualification: 'MBBS, MD',
        experience: 15,
        consultationFee: 500,
        languages: ['English', 'Hindi']
      },
      {
        name: 'Dr. Priya Patel',
        email: 'dr.priya@cityhospital.com',
        phone: '+911234567802',
        specialty: 'Cardiology',
        qualification: 'MBBS, MD, DM Cardiology',
        experience: 12,
        consultationFee: 800,
        languages: ['English', 'Hindi', 'Gujarati']
      },
      {
        name: 'Dr. Amit Kumar',
        email: 'dr.amit@cityhospital.com',
        phone: '+911234567803',
        specialty: 'Orthopedics',
        qualification: 'MBBS, MS Ortho',
        experience: 10,
        consultationFee: 700,
        languages: ['English', 'Hindi']
      },
      {
        name: 'Dr. Sneha Reddy',
        email: 'dr.sneha@cityhospital.com',
        phone: '+911234567804',
        specialty: 'Pediatrics',
        qualification: 'MBBS, MD Pediatrics',
        experience: 8,
        consultationFee: 600,
        languages: ['English', 'Hindi', 'Telugu']
      },
      {
        name: 'Dr. Kiran Mehta',
        email: 'dr.kiran@cityhospital.com',
        phone: '+911234567805',
        specialty: 'Dermatology',
        qualification: 'MBBS, MD Dermatology',
        experience: 6,
        consultationFee: 600,
        languages: ['English', 'Hindi']
      }
    ];

    const defaultAvailability = {
      monday: {
        isAvailable: true,
        slots: [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '18:00' }
        ]
      },
      tuesday: {
        isAvailable: true,
        slots: [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '18:00' }
        ]
      },
      wednesday: {
        isAvailable: true,
        slots: [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '18:00' }
        ]
      },
      thursday: {
        isAvailable: true,
        slots: [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '18:00' }
        ]
      },
      friday: {
        isAvailable: true,
        slots: [
          { startTime: '09:00', endTime: '13:00' },
          { startTime: '14:00', endTime: '18:00' }
        ]
      },
      saturday: {
        isAvailable: true,
        slots: [{ startTime: '09:00', endTime: '13:00' }]
      },
      sunday: {
        isAvailable: false,
        slots: []
      }
    };

    for (const docData of doctorsData) {
      // Create user for doctor
      const doctorUser = await User.create({
        name: docData.name,
        email: docData.email,
        phone: docData.phone,
        password: 'doctor123',
        role: 'doctor',
        hospitalId: hospital._id,
        isVerified: true
      });

      // Create doctor profile
      await Doctor.create({
        userId: doctorUser._id,
        hospitalId: hospital._id,
        specialty: docData.specialty,
        qualification: docData.qualification,
        registrationNumber: `MCI${Math.floor(100000 + Math.random() * 900000)}`,
        experience: docData.experience,
        consultationFee: docData.consultationFee,
        languages: docData.languages,
        availability: defaultAvailability,
        slotDuration: 15,
        maxPatientsPerDay: 40,
        isActive: true,
        isAcceptingPatients: true
      });
    }

    hospital.totalDoctors = doctorsData.length;
    await hospital.save();
    console.log(`Created ${doctorsData.length} Doctors`);

    // Create Sample Patients
    const patientsData = [
      {
        name: 'Rahul Verma',
        email: 'rahul@example.com',
        phone: '+911111111111',
        gender: 'male',
        dateOfBirth: new Date('1990-05-15')
      },
      {
        name: 'Priya Singh',
        email: 'priya@example.com',
        phone: '+912222222222',
        gender: 'female',
        dateOfBirth: new Date('1985-08-20')
      },
      {
        name: 'Amit Patel',
        email: 'amit@example.com',
        phone: '+913333333333',
        gender: 'male',
        dateOfBirth: new Date('1978-12-10')
      }
    ];

    for (const patientData of patientsData) {
      await User.create({
        ...patientData,
        password: 'patient123',
        role: 'patient',
        isVerified: true
      });
    }
    console.log(`Created ${patientsData.length} Sample Patients`);

    console.log('\n✅ Seed data created successfully!\n');
    console.log('Login Credentials:');
    console.log('==================');
    console.log('Super Admin: admin@mediflow.ai / admin123');
    console.log('Hospital Admin: cityhospital@mediflow.ai / hospital123');
    console.log('Doctor: dr.rajesh@cityhospital.com / doctor123');
    console.log('Patient: rahul@example.com / patient123');

    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
};

seedData();

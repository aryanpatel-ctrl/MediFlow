const express = require('express');
const router = express.Router();
const { Prescription, Medicine, Doctor, Appointment } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');

// @route   GET /api/prescriptions
// @desc    Get prescriptions (filtered by role)
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    patientId,
    doctorId,
    startDate,
    endDate
  } = req.query;

  const query = { isActive: true };

  // Filter based on user role
  if (req.user.role === 'patient') {
    // Patients can only see their own prescriptions
    query.patient = req.user.id;
  } else if (req.user.role === 'doctor') {
    // Doctors see prescriptions they created
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (doctor) {
      query.doctor = doctor._id;
    }
  }

  // Additional filters
  if (patientId && req.user.role !== 'patient') {
    query.patient = patientId;
  }

  if (doctorId) {
    query.doctor = doctorId;
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [prescriptions, total] = await Promise.all([
    Prescription.find(query)
      .populate('patient', 'name email phone')
      .populate({
        path: 'doctor',
        populate: { path: 'userId', select: 'name' }
      })
      .populate('hospital', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Prescription.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    prescriptions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   GET /api/prescriptions/patient/:patientId
// @desc    Get prescription history for a patient
// @access  Private/Doctor, Hospital Admin
router.get('/patient/:patientId', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.getPatientHistory(req.params.patientId, 20);

  res.status(200).json({
    success: true,
    prescriptions
  });
}));

// @route   GET /api/prescriptions/:id
// @desc    Get single prescription
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'name email phone dateOfBirth gender')
    .populate({
      path: 'doctor',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate('hospital', 'name address phone')
    .populate('medications.medicine');

  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }

  // Check access
  if (req.user.role === 'patient') {
    if (prescription.patient._id.toString() !== req.user.id) {
      throw new AppError('Not authorized to view this prescription', 403);
    }
  }

  res.status(200).json({
    success: true,
    prescription
  });
}));

// @route   POST /api/prescriptions
// @desc    Create new prescription
// @access  Private/Doctor
router.post('/', protect, authorize('doctor'), asyncHandler(async (req, res) => {
  const {
    patientId,
    appointmentId,
    diagnosis,
    symptoms,
    medications,
    labTests,
    advice,
    followUpDate,
    followUpInstructions,
    vitalSigns,
    notes
  } = req.body;

  // Get doctor info
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor) {
    throw new AppError('Doctor profile not found', 404);
  }

  // Validate medications and add medicine names
  const validatedMedications = [];
  for (const med of medications) {
    const medicine = await Medicine.findById(med.medicine);
    if (!medicine) {
      throw new AppError(`Medicine not found: ${med.medicine}`, 404);
    }
    validatedMedications.push({
      ...med,
      medicineName: medicine.name
    });
  }

  const prescriptionData = {
    patient: patientId,
    doctor: doctor._id,
    hospital: doctor.hospitalId,
    appointment: appointmentId || undefined,
    diagnosis,
    symptoms: symptoms || [],
    medications: validatedMedications,
    labTests: labTests || [],
    advice: advice || [],
    followUpDate: followUpDate || undefined,
    followUpInstructions: followUpInstructions || undefined,
    vitalSigns: vitalSigns || undefined,
    notes: notes || undefined
  };

  const prescription = await Prescription.create(prescriptionData);

  // If linked to appointment, update appointment status
  if (appointmentId) {
    await Appointment.findByIdAndUpdate(appointmentId, {
      status: 'completed',
      prescriptionId: prescription._id
    });
  }

  // Populate for response
  const populatedPrescription = await Prescription.findById(prescription._id)
    .populate('patient', 'name email phone')
    .populate({
      path: 'doctor',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('hospital', 'name');

  res.status(201).json({
    success: true,
    prescription: populatedPrescription
  });
}));

// @route   PUT /api/prescriptions/:id
// @desc    Update prescription (only if draft or same day)
// @access  Private/Doctor
router.put('/:id', protect, authorize('doctor'), asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }

  // Check if doctor owns this prescription
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor || prescription.doctor.toString() !== doctor._id.toString()) {
    throw new AppError('Not authorized to update this prescription', 403);
  }

  // Can only edit draft prescriptions or ones created today
  const createdToday = new Date(prescription.createdAt).toDateString() === new Date().toDateString();
  if (prescription.status !== 'draft' && !createdToday) {
    throw new AppError('Cannot edit prescription after 24 hours', 400);
  }

  // Validate medications if provided
  if (req.body.medications) {
    const validatedMedications = [];
    for (const med of req.body.medications) {
      const medicine = await Medicine.findById(med.medicine);
      if (!medicine) {
        throw new AppError(`Medicine not found: ${med.medicine}`, 404);
      }
      validatedMedications.push({
        ...med,
        medicineName: medicine.name
      });
    }
    req.body.medications = validatedMedications;
  }

  const updatedPrescription = await Prescription.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('patient', 'name email phone')
    .populate({
      path: 'doctor',
      populate: { path: 'userId', select: 'name' }
    });

  res.status(200).json({
    success: true,
    prescription: updatedPrescription
  });
}));

// @route   PUT /api/prescriptions/:id/status
// @desc    Update prescription status
// @access  Private/Doctor, Hospital Admin
router.put('/:id/status', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['draft', 'active', 'dispensed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }

  prescription.status = status;

  if (status === 'dispensed') {
    prescription.dispensedAt = new Date();
    prescription.dispensedBy = req.user.id;
  }

  await prescription.save();

  res.status(200).json({
    success: true,
    prescription
  });
}));

// @route   DELETE /api/prescriptions/:id
// @desc    Cancel/Deactivate prescription
// @access  Private/Doctor
router.delete('/:id', protect, authorize('doctor'), asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }

  // Check if doctor owns this prescription
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor || prescription.doctor.toString() !== doctor._id.toString()) {
    throw new AppError('Not authorized to cancel this prescription', 403);
  }

  prescription.status = 'cancelled';
  prescription.isActive = false;
  await prescription.save();

  res.status(200).json({
    success: true,
    message: 'Prescription cancelled'
  });
}));

// @route   GET /api/prescriptions/:id/print
// @desc    Get prescription data formatted for printing
// @access  Private
router.get('/:id/print', protect, asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'name email phone dateOfBirth gender address')
    .populate({
      path: 'doctor',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate('hospital', 'name address phone email logo')
    .populate('medications.medicine');

  if (!prescription) {
    throw new AppError('Prescription not found', 404);
  }

  // Format for printing
  const printData = {
    prescriptionNumber: prescription.prescriptionNumber,
    date: prescription.createdAt,
    hospital: {
      name: prescription.hospital.name,
      address: prescription.hospital.address,
      phone: prescription.hospital.phone
    },
    doctor: {
      name: prescription.doctor.userId.name,
      specialty: prescription.doctor.specialty,
      registrationNumber: prescription.doctor.registrationNumber
    },
    patient: {
      name: prescription.patient.name,
      age: prescription.patient.dateOfBirth
        ? Math.floor((new Date() - new Date(prescription.patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      gender: prescription.patient.gender,
      phone: prescription.patient.phone
    },
    diagnosis: prescription.diagnosis,
    vitalSigns: prescription.vitalSigns,
    medications: prescription.medications.map(med => ({
      name: med.medicineName,
      type: med.medicine?.type,
      dosage: med.dosage,
      frequency: med.frequency,
      timing: med.timing,
      duration: `${med.duration.value} ${med.duration.unit}`,
      quantity: med.quantity,
      instructions: med.instructions
    })),
    labTests: prescription.labTests,
    advice: prescription.advice,
    followUp: prescription.followUpDate ? {
      date: prescription.followUpDate,
      instructions: prescription.followUpInstructions
    } : null
  };

  res.status(200).json({
    success: true,
    printData
  });
}));

module.exports = router;

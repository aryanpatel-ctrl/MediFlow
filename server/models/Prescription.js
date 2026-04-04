const mongoose = require('mongoose');

const medicationItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true,
    enum: [
      'Once daily',
      'Twice daily',
      'Three times daily',
      'Four times daily',
      'Every 4 hours',
      'Every 6 hours',
      'Every 8 hours',
      'Every 12 hours',
      'As needed',
      'Before meals',
      'After meals',
      'At bedtime',
      'Weekly',
      'Once a week',
      'Twice a week'
    ]
  },
  timing: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening', 'Night', 'Before breakfast', 'After breakfast', 'Before lunch', 'After lunch', 'Before dinner', 'After dinner', 'With meals', 'Empty stomach']
  },
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      enum: ['days', 'weeks', 'months']
    }
  },
  quantity: {
    type: Number,
    required: true
  },
  instructions: String,
  refillsAllowed: {
    type: Number,
    default: 0
  }
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  prescriptionNumber: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  diagnosis: {
    type: String,
    required: true
  },
  symptoms: [String],
  medications: [medicationItemSchema],
  labTests: [{
    testName: String,
    instructions: String,
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine'
    }
  }],
  advice: [String],
  followUpDate: Date,
  followUpInstructions: String,
  vitalSigns: {
    bloodPressure: String,
    pulse: Number,
    temperature: Number,
    weight: Number,
    height: Number,
    oxygenSaturation: Number
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'dispensed', 'completed', 'cancelled'],
    default: 'active'
  },
  dispensedAt: Date,
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate prescription number before save
prescriptionSchema.pre('save', async function(next) {
  if (!this.prescriptionNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Count prescriptions for today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await this.constructor.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const sequence = String(count + 1).padStart(4, '0');
    this.prescriptionNumber = `RX${year}${month}${day}${sequence}`;
  }
  next();
});

// Indexes
prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ hospital: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ status: 1 });

// Static method to get patient prescription history
prescriptionSchema.statics.getPatientHistory = async function(patientId, limit = 10) {
  return this.find({ patient: patientId, isActive: true })
    .populate('doctor', 'specialty')
    .populate('hospital', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get doctor's prescriptions
prescriptionSchema.statics.getDoctorPrescriptions = async function(doctorId, status = null, limit = 50) {
  const query = { doctor: doctorId, isActive: true };
  if (status) query.status = status;

  return this.find(query)
    .populate('patient', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Prescription', prescriptionSchema);

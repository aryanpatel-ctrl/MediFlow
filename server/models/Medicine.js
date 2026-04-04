const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  genericName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Analgesic',
      'Antibiotic',
      'Antacid',
      'Antihistamine',
      'Antidiabetic',
      'Cardiovascular',
      'Vitamin',
      'Cough & Cold',
      'Antifungal',
      'Steroid',
      'Antipyretic',
      'Anti-inflammatory',
      'Antihypertensive',
      'Antidepressant',
      'Antianxiety',
      'Gastrointestinal',
      'Respiratory',
      'Dermatological',
      'Ophthalmic',
      'Other'
    ]
  },
  type: {
    type: String,
    required: true,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Gel', 'Spray', 'Suspension']
  },
  strength: {
    type: String,
    required: true
  },
  manufacturer: String,
  composition: String,
  commonDosages: [{
    type: String
  }],
  frequencies: [{
    type: String
  }],
  timings: [{
    type: String
  }],
  sideEffects: [String],
  contraindications: [String],
  warnings: [String],
  storageInstructions: String,
  pricePerUnit: {
    type: Number,
    default: 0
  },
  requiresPrescription: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Text index for search
medicineSchema.index({ name: 'text', genericName: 'text', composition: 'text' });

// Static method to search medicines
medicineSchema.statics.search = async function(query, category = null, limit = 20) {
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { genericName: { $regex: query, $options: 'i' } },
      { composition: { $regex: query, $options: 'i' } }
    ]
  };

  if (category) {
    searchQuery.category = category;
  }

  return this.find(searchQuery).limit(limit).sort({ name: 1 });
};

module.exports = mongoose.model('Medicine', medicineSchema);

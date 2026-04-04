const express = require('express');
const router = express.Router();
const { Medicine } = require('../models');
const { protect, authorize, asyncHandler, AppError } = require('../middleware');

// @route   GET /api/medicines
// @desc    Get all medicines (with pagination and filters)
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    category,
    type,
    search,
    requiresPrescription
  } = req.query;

  const query = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (type) {
    query.type = type;
  }

  if (requiresPrescription !== undefined) {
    query.requiresPrescription = requiresPrescription === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { composition: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [medicines, total] = await Promise.all([
    Medicine.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Medicine.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    medicines,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   GET /api/medicines/search
// @desc    Quick search medicines for prescription
// @access  Private/Doctor
router.get('/search', protect, authorize('doctor', 'hospital_admin'), asyncHandler(async (req, res) => {
  const { q, category, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      medicines: []
    });
  }

  const medicines = await Medicine.search(q, category, parseInt(limit));

  res.status(200).json({
    success: true,
    medicines: medicines.map(med => ({
      _id: med._id,
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      type: med.type,
      strength: med.strength,
      commonDosages: med.commonDosages,
      frequencies: med.frequencies,
      timings: med.timings,
      requiresPrescription: med.requiresPrescription
    }))
  });
}));

// @route   GET /api/medicines/categories
// @desc    Get all medicine categories
// @access  Private
router.get('/categories', protect, asyncHandler(async (req, res) => {
  const categories = await Medicine.distinct('category', { isActive: true });

  res.status(200).json({
    success: true,
    categories
  });
}));

// @route   GET /api/medicines/types
// @desc    Get all medicine types
// @access  Private
router.get('/types', protect, asyncHandler(async (req, res) => {
  const types = await Medicine.distinct('type', { isActive: true });

  res.status(200).json({
    success: true,
    types
  });
}));

// @route   GET /api/medicines/:id
// @desc    Get single medicine details
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    throw new AppError('Medicine not found', 404);
  }

  res.status(200).json({
    success: true,
    medicine
  });
}));

// @route   POST /api/medicines
// @desc    Add new medicine (admin only)
// @access  Private/Hospital Admin
router.post('/', protect, authorize('hospital_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const medicine = await Medicine.create(req.body);

  res.status(201).json({
    success: true,
    medicine
  });
}));

// @route   PUT /api/medicines/:id
// @desc    Update medicine
// @access  Private/Hospital Admin
router.put('/:id', protect, authorize('hospital_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!medicine) {
    throw new AppError('Medicine not found', 404);
  }

  res.status(200).json({
    success: true,
    medicine
  });
}));

// @route   DELETE /api/medicines/:id
// @desc    Deactivate medicine (soft delete)
// @access  Private/Hospital Admin
router.delete('/:id', protect, authorize('hospital_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!medicine) {
    throw new AppError('Medicine not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Medicine deactivated'
  });
}));

module.exports = router;

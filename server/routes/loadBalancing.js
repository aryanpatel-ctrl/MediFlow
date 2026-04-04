const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const loadBalancingService = require('../services/loadBalancingService');

/**
 * @route   GET /api/load-balancing/hospital/:hospitalId/distribution
 * @desc    Get hospital-wide load distribution
 * @access  Private (hospital_admin)
 */
router.get('/hospital/:hospitalId/distribution', protect, authorize('hospital_admin'), async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { date } = req.query;

    const distribution = await loadBalancingService.getHospitalLoadDistribution(
      hospitalId,
      date ? new Date(date) : new Date()
    );

    res.json({
      success: true,
      distribution
    });
  } catch (error) {
    console.error('Error getting load distribution:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/load-balancing/doctor/:doctorId/load
 * @desc    Get load score for a specific doctor
 * @access  Private
 */
router.get('/doctor/:doctorId/load', protect, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const load = await loadBalancingService.calculateDoctorLoad(
      doctorId,
      date ? new Date(date) : new Date()
    );

    res.json({
      success: true,
      load
    });
  } catch (error) {
    console.error('Error getting doctor load:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/load-balancing/suggest-doctor
 * @desc    Find the least busy doctor for a specialty
 * @access  Private
 */
router.get('/suggest-doctor', protect, async (req, res) => {
  try {
    const { hospitalId, specialty, preferredDoctorId, date } = req.query;

    if (!hospitalId || !specialty) {
      return res.status(400).json({
        success: false,
        message: 'hospitalId and specialty are required'
      });
    }

    const result = await loadBalancingService.findLeastBusyDoctor(
      hospitalId,
      specialty,
      preferredDoctorId,
      date ? new Date(date) : new Date()
    );

    res.json(result);
  } catch (error) {
    console.error('Error suggesting doctor:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/load-balancing/optimal-appointment
 * @desc    Get optimal appointment suggestions with load balancing
 * @access  Private
 */
router.get('/optimal-appointment', protect, async (req, res) => {
  try {
    const { hospitalId, specialty, urgencyScore, preferredDate } = req.query;

    if (!hospitalId || !specialty) {
      return res.status(400).json({
        success: false,
        message: 'hospitalId and specialty are required'
      });
    }

    const result = await loadBalancingService.suggestOptimalAppointment(
      hospitalId,
      specialty,
      parseInt(urgencyScore) || 3,
      preferredDate ? new Date(preferredDate) : null
    );

    res.json(result);
  } catch (error) {
    console.error('Error getting optimal appointment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/load-balancing/check-overbook
 * @desc    Check if a slot can be overbooked
 * @access  Private (hospital_admin)
 */
router.post('/check-overbook', protect, authorize('hospital_admin'), async (req, res) => {
  try {
    const { doctorId, date, slotTime } = req.body;

    if (!doctorId || !date || !slotTime) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, date, and slotTime are required'
      });
    }

    const result = await loadBalancingService.canOverbook(
      doctorId,
      new Date(date),
      slotTime
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error checking overbooking:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/load-balancing/redistribute
 * @desc    Redistribute patients when a doctor becomes unavailable
 * @access  Private (hospital_admin)
 */
router.post('/redistribute', protect, authorize('hospital_admin'), async (req, res) => {
  try {
    const { doctorId, date, reason } = req.body;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: 'doctorId and date are required'
      });
    }

    const result = await loadBalancingService.redistributePatients(
      doctorId,
      new Date(date),
      reason || 'Doctor unavailable'
    );

    res.json(result);
  } catch (error) {
    console.error('Error redistributing patients:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

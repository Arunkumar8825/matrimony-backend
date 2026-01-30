const express = require('express');
const router = express.Router();
const {
  saveHoroscope,
  getHoroscope,
  updateHoroscope,
  getHoroscopeMatch,
  uploadHoroscopeImage
} = require('../controllers/horoscopeController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const { horoscopeValidators, validate } = require('../utils/validators');

// @route   POST /api/horoscope
// @desc    Save horoscope details
// @access  Private
router.post(
  '/',
  protect,
  horoscopeValidators.saveHoroscope,
  validate,
  saveHoroscope
);

// @route   GET /api/horoscope
// @desc    Get horoscope details
// @access  Private
router.get('/', protect, getHoroscope);

// @route   PUT /api/horoscope
// @desc    Update horoscope details
// @access  Private
router.put(
  '/',
  protect,
  horoscopeValidators.saveHoroscope.map(validator => validator.optional()),
  validate,
  updateHoroscope
);

// @route   POST /api/horoscope/match
// @desc    Get horoscope match with another user
// @access  Private
router.post(
  '/match',
  protect,
  horoscopeValidators.getHoroscopeMatch,
  validate,
  getHoroscopeMatch
);

// @route   POST /api/horoscope/upload
// @desc    Upload horoscope image
// @access  Private
router.post(
  '/upload',
  protect,
  uploadSingle('horoscope'),
  uploadHoroscopeImage
);

// @route   GET /api/horoscope/compatibility/:userId
// @desc    Get horoscope compatibility with user
// @access  Private
router.get('/compatibility/:userId', protect, getHoroscopeMatch);

// @route   GET /api/horoscope/report
// @desc    Generate horoscope report
// @access  Private
router.get('/report', protect, async (req, res) => {
  try {
    // Get horoscope details
    const horoscope = await require('../models/Horoscope').findOne({ 
      user: req.user.id 
    });
    
    if (!horoscope) {
      return res.status(404).json({
        success: false,
        error: 'Horoscope not found'
      });
    }

    // Generate report
    const report = {
      user: req.user.id,
      dateOfBirth: horoscope.dateOfBirth,
      timeOfBirth: horoscope.timeOfBirth,
      placeOfBirth: horoscope.placeOfBirth,
      rashi: horoscope.rashi,
      nakshatra: horoscope.nakshatra,
      nakshatraPada: horoscope.nakshatraPada,
      manglik: horoscope.manglik,
      planets: horoscope.planets,
      // Add more details as needed
    };

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
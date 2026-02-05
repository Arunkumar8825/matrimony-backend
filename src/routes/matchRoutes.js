const express = require('express');
const router = express.Router();
const {
  sendInterest,
  respondToInterest,
  getMatchSuggestions,
  getReceivedInterests,
  getSentInterests,
  getAcceptedMatches,
  getCompatibility
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.post('/interest', protect, sendInterest);
router.put('/interest/:interestId', protect, respondToInterest);
router.get('/suggestions', protect, getMatchSuggestions);
router.get('/interests/received', protect, getReceivedInterests);
router.get('/interests/send', protect, getSentInterests);
router.get('/accepted', protect, getAcceptedMatches);
router.get('/compatibility/:userId', protect, getCompatibility);

module.exports = router;
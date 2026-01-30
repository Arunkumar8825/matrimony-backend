const express = require('express');
const router = express.Router();
const {
  searchProfiles,
  getFilters,
  quickSearch
} = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, searchProfiles);
router.get('/filters', protect, getFilters);
router.get('/quick', protect, quickSearch);

module.exports = router;
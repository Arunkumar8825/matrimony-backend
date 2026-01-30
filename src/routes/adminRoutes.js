const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  verifyProfile,
  getAllPayments,
  getAllInterests,
  getAllMessages,
  getReports
} = require('../controllers/adminController');
const { adminProtect } = require('../middleware/authMiddleware');

router.post('/login', adminLogin);
router.get('/dashboard', adminProtect, getDashboardStats);
router.get('/users', adminProtect, getAllUsers);
router.get('/users/:userId', adminProtect, getUserDetails);
router.put('/users/:userId/status', adminProtect, updateUserStatus);
router.put('/users/:userId/verify', adminProtect, verifyProfile);
router.get('/payments', adminProtect, getAllPayments);
router.get('/interests', adminProtect, getAllInterests);
router.get('/messages', adminProtect, getAllMessages);
router.get('/reports', adminProtect, getReports);

module.exports = router;
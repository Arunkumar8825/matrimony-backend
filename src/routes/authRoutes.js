const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router .post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.put('/update-password', protect, updatePassword);
router.post('/verify-email', protect, verifyEmail);

module.exports = router;




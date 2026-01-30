const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPlans,
  getUserSubscriptions,
  cancelSubscription
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/plans', protect, getPlans);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/subscriptions', protect, getUserSubscriptions);
router.put('/subscription/:subscriptionId/cancel', protect, cancelSubscription);

module.exports = router;
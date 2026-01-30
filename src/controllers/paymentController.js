const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { SUBSCRIPTION_PLANS } = require('../config/constants');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Get subscription plans
// @route   GET /api/payments/plans
// @access  Private
exports.getPlans = async (req, res) => {
  try {
    const plans = Object.values(SUBSCRIPTION_PLANS);

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create payment order
// @route   POST /api/payments/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { plan, duration } = req.body;

    if (!plan || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Please provide plan and duration'
      });
    }

    const planConfig = SUBSCRIPTION_PLANS[plan.toUpperCase()];
    if (!planConfig) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    // Calculate amount based on duration
    const amount = planConfig.price * duration;

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user.id,
        plan: plan,
        duration: duration,
        features: JSON.stringify(planConfig.features)
      }
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = await Payment.create({
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: amount,
      plan: plan,
      duration: duration,
      features: planConfig.features
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment._id
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment details'
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Update payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'completed';
    payment.paymentMethod = req.body.paymentMethod || 'razorpay';

    // Calculate subscription dates
    const now = new Date();
    payment.startsAt = now;
    
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + payment.duration);
    payment.expiresAt = expiryDate;

    await payment.save();

    // Update user subscription
    const user = await User.findById(req.user.id);
    user.isPremium = true;
    user.premiumType = payment.plan;
    user.premiumExpiresAt = expiryDate;
    await user.save();

    // Send subscription activation email
    // await sendEmail({...});

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment verified and subscription activated'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get user subscriptions
// @route   GET /api/payments/subscriptions
// @access  Private
exports.getUserSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Payment.find({ 
      user: req.user.id,
      status: 'completed'
    })
    .sort({ createdAt: -1 });

    // Get current subscription info
    const user = await User.findById(req.user.id);
    let currentSubscription = null;

    if (user.isPremium && user.premiumExpiresAt > new Date()) {
      const daysLeft = Math.ceil((user.premiumExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      
      currentSubscription = {
        plan: user.premiumType,
        startsAt: user.premiumExpiresAt ? 
          new Date(user.premiumExpiresAt.getTime() - (user.premiumType === 'Basic' ? 30 : user.premiumType === 'Gold' ? 90 : 365) * 24 * 60 * 60 * 1000) : 
          null,
        expiresAt: user.premiumExpiresAt,
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        isActive: daysLeft > 0
      };
    }

    res.status(200).json({
      success: true,
      data: {
        current: currentSubscription,
        history: subscriptions
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Cancel subscription
// @route   PUT /api/payments/subscription/:subscriptionId/cancel
// @access  Private
exports.cancelSubscription = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.subscriptionId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Check if user owns this subscription
    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    // Check if subscription can be cancelled
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed subscriptions can be cancelled'
      });
    }

    // Calculate refund amount based on usage
    const now = new Date();
    const totalDays = Math.ceil((payment.expiresAt - payment.startsAt) / (1000 * 60 * 60 * 24));
    const usedDays = Math.ceil((now - payment.startsAt) / (1000 * 60 * 60 * 24));
    
    let refundAmount = 0;
    let refundReason = '';

    if (usedDays <= 7) {
      // Full refund within 7 days
      refundAmount = payment.amount;
      refundReason = 'Cancelled within 7 days';
    } else if (usedDays <= 30) {
      // 50% refund within 30 days
      refundAmount = payment.amount * 0.5;
      refundReason = 'Cancelled within 30 days';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel after 30 days'
      });
    }

    // Update payment record
    payment.status = 'refunded';
    payment.refundAmount = refundAmount;
    payment.refundReason = refundReason;
    await payment.save();

    // Update user subscription
    const user = await User.findById(req.user.id);
    user.isPremium = false;
    user.premiumType = 'None';
    user.premiumExpiresAt = null;
    await user.save();

    // Initiate refund through Razorpay
    // const refund = await razorpay.payments.refund(razorpay_payment_id, {
    //   amount: refundAmount * 100,
    //   speed: 'normal',
    //   notes: {
    //     reason: refundReason
    //   }
    // });

    res.status(200).json({
      success: true,
      data: {
        refundAmount,
        refundReason,
        message: 'Subscription cancelled successfully'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const payments = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: payments.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: payments
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Check subscription status
// @route   GET /api/payments/status
// @access  Private
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let subscriptionStatus = {
      isPremium: false,
      plan: 'None',
      expiresAt: null,
      daysLeft: 0,
      features: []
    };

    if (user.isPremium && user.premiumExpiresAt > new Date()) {
      const daysLeft = Math.ceil((user.premiumExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      
      subscriptionStatus = {
        isPremium: true,
        plan: user.premiumType,
        expiresAt: user.premiumExpiresAt,
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        features: SUBSCRIPTION_PLANS[user.premiumType.toUpperCase()]?.features || []
      };
    }

    res.status(200).json({
      success: true,
      data: subscriptionStatus
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
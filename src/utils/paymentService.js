const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { sendEmail } = require('./emailService');
const { SUBSCRIPTION_PLANS } = require('../config/constants');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  // Create payment order
  async createOrder(userId, plan, duration) {
    try {
      const planConfig = SUBSCRIPTION_PLANS[plan.toUpperCase()];
      
      if (!planConfig) {
        throw new Error('Invalid plan selected');
      }

      // Calculate amount
      const amount = planConfig.price * duration;

      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${userId}`,
        notes: {
          userId,
          plan,
          duration: duration.toString(),
          features: JSON.stringify(planConfig.features)
        }
      });

      // Create payment record
      const payment = await Payment.create({
        user: userId,
        razorpayOrderId: order.id,
        amount,
        plan,
        duration,
        features: planConfig.features,
        status: 'pending'
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment._id
      };
    } catch (error) {
      console.error('Create order error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment
  async verifyPayment(paymentData) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paymentId
      } = paymentData;

      // Verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        throw new Error('Payment verification failed');
      }

      // Get payment record
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment record
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = 'completed';
      payment.paymentMethod = paymentData.paymentMethod || 'razorpay';

      // Calculate subscription dates
      const now = new Date();
      payment.startsAt = now;
      
      const expiryDate = new Date(now);
      expiryDate.setMonth(expiryDate.getMonth() + payment.duration);
      payment.expiresAt = expiryDate;

      await payment.save();

      // Update user subscription
      const user = await User.findById(payment.user);
      if (!user) {
        throw new Error('User not found');
      }

      user.isPremium = true;
      user.premiumType = payment.plan;
      user.premiumExpiresAt = expiryDate;
      await user.save();

      // Send subscription activation email
      await this.sendSubscriptionEmail(user, payment);

      return {
        success: true,
        payment,
        message: 'Payment verified and subscription activated'
      };
    } catch (error) {
      console.error('Verify payment error:', error);
      throw error;
    }
  }

  // Send subscription email
  async sendSubscriptionEmail(user, payment) {
    try {
      const planConfig = SUBSCRIPTION_PLANS[payment.plan.toUpperCase()];
      
      const emailData = {
        email: user.email,
        subject: `🎉 Your ${payment.plan} Subscription is Activated!`,
        template: 'premiumActivated',
        data: {
          name: user.firstName,
          plan: {
            name: payment.plan,
            duration: payment.duration,
            price: payment.amount,
            expiryDate: payment.expiresAt.toLocaleDateString('en-IN'),
            features: planConfig?.features || []
          }
        }
      };

      await sendEmail(emailData);
    } catch (error) {
      console.error('Subscription email error:', error);
      // Don't throw error, just log it
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('user', 'firstName lastName email phone');
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        success: true,
        payment
      };
    } catch (error) {
      console.error('Get payment details error:', error);
      throw error;
    }
  }

  // Get user payments
  async getUserPayments(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;
      const skip = (page - 1) * limit;

      const query = { user: userId };
      if (status) {
        query.status = status;
      }

      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments(query);

      return {
        success: true,
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get user payments error:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentId, refundReason) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      // Calculate refund amount based on usage
      const now = new Date();
      const totalDays = Math.ceil((payment.expiresAt - payment.startsAt) / (1000 * 60 * 60 * 24));
      const usedDays = Math.ceil((now - payment.startsAt) / (1000 * 60 * 60 * 24));
      
      let refundAmount = 0;

      if (usedDays <= 7) {
        // Full refund within 7 days
        refundAmount = payment.amount;
      } else if (usedDays <= 30) {
        // 50% refund within 30 days
        refundAmount = payment.amount * 0.5;
      } else {
        throw new Error('Cannot refund after 30 days');
      }

      // Initiate refund through Razorpay
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100), // Convert to paise
        speed: 'normal',
        notes: {
          reason: refundReason,
          paymentId: payment._id.toString(),
          userId: payment.user.toString()
        }
      });

      // Update payment record
      payment.status = 'refunded';
      payment.refundAmount = refundAmount;
      payment.refundReason = refundReason;
      await payment.save();

      // Update user subscription
      const user = await User.findById(payment.user);
      if (user) {
        user.isPremium = false;
        user.premiumType = 'None';
        user.premiumExpiresAt = null;
        await user.save();
      }

      // Send refund email
      await this.sendRefundEmail(user, payment, refundAmount);

      return {
        success: true,
        refundId: refund.id,
        refundAmount,
        refundReason,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      console.error('Refund payment error:', error);
      throw error;
    }
  }

  // Send refund email
  async sendRefundEmail(user, payment, refundAmount) {
    try {
      const emailData = {
        email: user.email,
        subject: '💰 Refund Processed for Your Subscription',
        template: 'refundProcessed',
        data: {
          name: user.firstName,
          plan: payment.plan,
          refundAmount,
          refundDate: new Date().toLocaleDateString('en-IN'),
          paymentDate: payment.createdAt.toLocaleDateString('en-IN')
        }
      };

      await sendEmail(emailData);
    } catch (error) {
      console.error('Refund email error:', error);
    }
  }

  // Check subscription status
  async getSubscriptionStatus(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      let subscriptionStatus = {
        isPremium: false,
        plan: 'None',
        expiresAt: null,
        daysLeft: 0,
        features: []
      };

      if (user.isPremium && user.premiumExpiresAt > new Date()) {
        const daysLeft = Math.ceil((user.premiumExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        const planConfig = SUBSCRIPTION_PLANS[user.premiumType.toUpperCase()];
        
        subscriptionStatus = {
          isPremium: true,
          plan: user.premiumType,
          expiresAt: user.premiumExpiresAt,
          daysLeft: daysLeft > 0 ? daysLeft : 0,
          features: planConfig?.features || []
        };
      }

      return {
        success: true,
        subscriptionStatus
      };
    } catch (error) {
      console.error('Get subscription status error:', error);
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStatistics(startDate, endDate) {
    try {
      const matchQuery = { status: 'completed' };
      
      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }

      // Total revenue
      const revenueStats = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalPayments: { $sum: 1 }
          }
        }
      ]);

      // Revenue by plan
      const revenueByPlan = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$plan',
            revenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]);

      // Daily revenue for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyRevenue = await Payment.aggregate([
        {
          $match: {
            ...matchQuery,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        success: true,
        statistics: {
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          totalPayments: revenueStats[0]?.totalPayments || 0,
          revenueByPlan,
          dailyRevenue
        }
      };
    } catch (error) {
      console.error('Get payment statistics error:', error);
      throw error;
    }
  }

  // Generate invoice
  async generateInvoice(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('user', 'firstName lastName email phone address');
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Generate invoice number
      const invoiceNumber = `INV-${payment._id.toString().slice(-8).toUpperCase()}`;
      
      // Calculate tax (simplified)
      const taxRate = 0.18; // 18% GST
      const taxAmount = payment.amount * taxRate;
      const totalAmount = payment.amount + taxAmount;

      const invoice = {
        invoiceNumber,
        date: payment.createdAt,
        dueDate: new Date(payment.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
        user: payment.user,
        plan: payment.plan,
        duration: payment.duration,
        subtotal: payment.amount,
        taxRate: taxRate * 100,
        taxAmount,
        totalAmount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.createdAt,
        status: payment.status
      };

      return {
        success: true,
        invoice
      };
    } catch (error) {
      console.error('Generate invoice error:', error);
      throw error;
    }
  }

  // Send invoice email
  async sendInvoiceEmail(paymentId) {
    try {
      const { invoice } = await this.generateInvoice(paymentId);
      
      const emailData = {
        email: invoice.user.email,
        subject: `Invoice ${invoice.invoiceNumber} - Yadhavar Matrimony`,
        template: 'invoice',
        data: {
          name: `${invoice.user.firstName} ${invoice.user.lastName}`,
          invoice
        }
      };

      await sendEmail(emailData);

      return {
        success: true,
        message: 'Invoice email sent successfully'
      };
    } catch (error) {
      console.error('Send invoice email error:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
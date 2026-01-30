const Admin = require('../models/Admin');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Interest = require('../models/Interest');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check for admin
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      admin.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (admin.loginAttempts >= 5) {
        admin.accountLockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
      }
      
      await admin.save();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts
    admin.loginAttempts = 0;
    admin.accountLockedUntil = null;
    admin.lastLogin = Date.now();
    await admin.save();

    // Generate token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Remove password from response
    admin.password = undefined;

    res.status(200).json({
      success: true,
      token,
      data: admin
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      isPremium = '',
      isVerified = ''
    } = req.query;

    const query = {};

    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.isActive = status === 'active';
    }

    // Filter by premium status
    if (isPremium) {
      query.isPremium = isPremium === 'true';
    }

    // Filter by verification status
    if (isVerified) {
      query.isProfileVerified = isVerified === 'true';
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password -tokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:userId
// @access  Private/Admin
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -tokens')
      .populate('interestsSent', 'fromUser toUser status')
      .populate('interestsReceived', 'fromUser toUser status')
      .populate('premiumPlan', 'name amount duration');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's payment history
    const payments = await Payment.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's recent messages
    const recentMessages = await Message.find({
      $or: [{ sender: user._id }, { receiver: user._id }]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sender', 'firstName lastName')
      .populate('receiver', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: {
        user,
        payments,
        recentMessages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:userId/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive, isBlocked, blockReason } = req.body;

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update status fields
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    if (isBlocked !== undefined) {
      user.isBlocked = isBlocked;
      if (isBlocked && blockReason) {
        user.blockReason = blockReason;
        user.blockedAt = Date.now();
      } else if (!isBlocked) {
        user.blockReason = undefined;
        user.blockedAt = undefined;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: 'User status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalPremiumUsers = await User.countDocuments({ isPremium: true });
    const totalActiveUsers = await User.countDocuments({ isActive: true });
    const totalInterests = await Interest.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalPayments = await Payment.countDocuments();
    
    // Revenue calculations
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          todayRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                '$amount',
                0
              ]
            }
          },
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    // New users in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Gender distribution
    const genderStats = await User.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Age distribution
    const ageStats = await User.aggregate([
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [18, 25, 30, 35, 40, 45, 50, 100],
          default: '50+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Recent activities
    const recentUsers = await User.find()
      .select('firstName lastName email createdAt isPremium')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentPayments = await Payment.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          totalUsers,
          totalPremiumUsers,
          totalActiveUsers,
          totalInterests,
          totalMessages,
          totalPayments,
          newUsers
        },
        revenue: revenueResult[0] || { totalRevenue: 0, todayRevenue: 0, monthlyRevenue: 0 },
        genderDistribution: genderStats,
        ageDistribution: ageStats,
        recentUsers,
        recentPayments
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Verify user profile
// @route   PUT /api/admin/users/:userId/verify
// @access  Private/Admin
exports.verifyProfile = async (req, res) => {
  try {
    const { isVerified, verificationStatus, verificationNotes } = req.body;

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (isVerified !== undefined) {
      user.isProfileVerified = isVerified;
    }

    if (verificationStatus) {
      user.verificationStatus = verificationStatus;
    }

    // Mark photos as verified
    if (isVerified && user.profilePhoto) {
      user.profilePhoto.isVerified = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: `Profile ${isVerified ? 'verified' : 'unverified'} successfully`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      plan = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by plan
    if (plan) {
      query.plan = plan;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totalRevenue = await Payment.aggregate([
      { $match: { ...query, status: 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      totalRevenue: totalRevenue[0]?.total || 0,
      data: payments
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get all interests
// @route   GET /api/admin/interests
// @access  Private/Admin
exports.getAllInterests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      type = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const interests = await Interest.find(query)
      .populate('fromUser', 'firstName lastName email')
      .populate('toUser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Interest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: interests.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: interests
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get all messages
// @route   GET /api/admin/messages
// @access  Private/Admin
exports.getAllMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email')
      .populate('chatId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    res.status(200).json({
      success: true,
      count: messages.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: messages
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get reports
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getReports = async (req, res) => {
  try {
    const { type = 'daily', startDate = '', endDate = '' } = req.query;

    let matchQuery = {};

    // Set date range
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // If no dates provided, default to last 30 days
    if (!startDate && !endDate) {
      matchQuery.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    // User registration report
    const userRegistrations = await User.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Payment report
    const paymentReport = await Payment.aggregate([
      { $match: { ...matchQuery, status: 'completed' } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Interest report
    const interestReport = await Interest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          sent: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User demographics
    const userDemographics = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byGender: {
            $push: {
              gender: "$gender",
              count: 1
            }
          },
          byAge: {
            $push: {
              age: "$age",
              count: 1
            }
          },
          byLocation: {
            $push: {
              location: "$currentCity",
              count: 1
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        userRegistrations,
        paymentReport,
        interestReport,
        userDemographics: userDemographics[0] || {}
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create new admin
// @route   POST /api/admin
// @access  Private/SuperAdmin
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name, role, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Admin with this email already exists'
      });
    }

    // Create admin
    const admin = await Admin.create({
      email,
      password,
      name,
      role,
      permissions
    });

    // Remove password from response
    admin.password = undefined;

    res.status(201).json({
      success: true,
      data: admin,
      message: 'Admin created successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admin/:id
// @access  Private/SuperAdmin
exports.updateAdmin = async (req, res) => {
  try {
    const { name, role, permissions, isActive } = req.body;

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Update fields
    if (name) admin.name = name;
    if (role) admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    admin.password = undefined;

    res.status(200).json({
      success: true,
      data: admin,
      message: 'Admin updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get all admins
// @route   GET /api/admin/all
// @access  Private/SuperAdmin
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
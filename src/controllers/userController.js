const User = require('../models/User');
const Profile = require('../models/Profile');
const Interest = require('../models/Interest');

// @desc    Get all users (for admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      verification = ''
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
      if (status === 'active') query.isActive = true;
      if (status === 'inactive') query.isActive = false;
      if (status === 'blocked') query.isBlocked = true;
      if (status === 'premium') query.isPremium = true;
    }

    // Filter by verification status
    if (verification) {
      if (verification === 'verified') query.isProfileVerified = true;
      if (verification === 'pending') query.verificationStatus = 'Pending';
      if (verification === 'rejected') query.verificationStatus = 'Rejected';
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
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
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update user status (admin only)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive, isBlocked, verificationStatus } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields if provided
    if (isActive !== undefined) user.isActive = isActive;
    if (isBlocked !== undefined) user.isBlocked = isBlocked;
    if (verificationStatus) user.verificationStatus = verificationStatus;

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: 'User status updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete - mark as deleted
    user.deletedAt = Date.now();
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const verifiedUsers = await User.countDocuments({ isProfileVerified: true });
    
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

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        verified: verifiedUsers,
        newLast7Days: newUsers,
        genderDistribution: genderStats,
        ageDistribution: ageStats
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with profile
    const user = await User.findById(userId)
      .select('-password')
     
    // Get counts
    const interestsReceived = await Interest.countDocuments({ 
      toUser: userId, 
      status: 'Pending' 
    });

    const interestsSent = await Interest.countDocuments({ 
      fromUser: userId 
    });

    const acceptedMatches = await Interest.countDocuments({
      $or: [
        { fromUser: userId, status: 'Accepted' },
        { toUser: userId, status: 'Accepted' }
      ]
    });

    // Get recent profile views (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get match suggestions count
    const oppositeGender = user.gender === 'Male' ? 'Female' : 'Male';
    const matchSuggestions = await User.countDocuments({
      gender: oppositeGender,
      isActive: true,
      isProfileComplete: true,
      _id: { $ne: userId }
    });

    // Get unread messages count
    const unreadMessages = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });

    // Get premium expiry info
    let premiumInfo = null;
    if (user.isPremium && user.premiumExpiresAt) {
      const daysLeft = Math.ceil((user.premiumExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      premiumInfo = {
        type: user.premiumType,
        expiresAt: user.premiumExpiresAt,
        daysLeft: daysLeft > 0 ? daysLeft : 0
      };
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        counts: {
          interestsReceived,
          interestsSent,
          acceptedMatches,
          matchSuggestions,
          unreadMessages
        },
        premiumInfo,
        profileCompletion: user.profileCompletePercentage
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.status(200).json({
      success: true,
      data: user.preferences,
      message: 'Preferences updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Deactivate account
// @route   PUT /api/users/deactivate
// @access  Private
exports.deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.isActive = false;
    user.deactivatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Reactivate account
// @route   PUT /api/users/reactivate
// @access  Public
exports.reactivateAccount = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.isActive = true;
    user.deactivatedAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
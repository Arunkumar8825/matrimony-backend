const User = require('../models/User');
const Interest = require('../models/Interest');
const { calculateMatchScore } = require('../utils/matchAlgorithms');

// @desc    Send interest
// @route   POST /api/matches/interest
// @access  Private
exports.sendInterest = async (req, res) => {
  try {
    const { toUserId, message, type = 'Interest' } = req.body;

    // Check if user exists
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if already sent interest
    const existingInterest = await Interest.findOne({
      fromUser: req.user.id,
      toUser: toUserId
    });

    if (existingInterest) {
      return res.status(400).json({
        success: false,
        error: 'Interest already sent'
      });
    }

    // Create interest
    const interest = await Interest.create({
      fromUser: req.user.id,
      toUser: toUserId,
      message,
      type
    });

    // Send notification (email/push)

    res.status(201).json({
      success: true,
      data: interest,
      message: 'Interest sent successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Respond to interest
// @route   PUT /api/matches/interest/:interestId
// @access  Private
exports.respondToInterest = async (req, res) => {
  try {
    const { status } = req.body; // 'Accepted' or 'Rejected'

    const interest = await Interest.findById(req.params.interestId);

    if (!interest) {
      return res.status(404).json({
        success: false,
        error: 'Interest not found'
      });
    }

    // Check if user is the receiver
    if (interest.toUser.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }

    interest.status = status;
    interest.respondedAt = Date.now();
    interest.isRead = true;
    await interest.save();

    // If accepted, create a chat
    if (status === 'Accepted') {
      // Chat creation logic
    }

    res.status(200).json({
      success: true,
      data: interest,
      message: `Interest ${status.toLowerCase()}`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get match suggestions
// @route   GET /api/matches/suggestions
// @access  Private
exports.getMatchSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get opposite gender
    const gender = user.gender === 'Male' ? 'Female' : 'Male';
    
    // Base query
    let query = {
      gender,
      isActive: true,
      isBlocked: false,
      isProfileComplete: true,
      _id: { $ne: user._id }
    };

    // Apply user preferences
    if (user.preferences) {
      // Age range
      if (user.preferences.ageRange) {
        query.age = {
          $gte: user.preferences.ageRange.min,
          $lte: user.preferences.ageRange.max
        };
      }

      // Height range
      if (user.preferences.heightRange) {
        query.height = {
          $gte: user.preferences.heightRange.min,
          $lte: user.preferences.heightRange.max
        };
      }

      // Marital status
      if (user.preferences.maritalStatus && user.preferences.maritalStatus.length > 0) {
        query.maritalStatus = { $in: user.preferences.maritalStatus };
      }

      // Education
      if (user.preferences.education && user.preferences.education.length > 0) {
        query.education = { $in: user.preferences.education };
      }

      // Profession
      if (user.preferences.profession && user.preferences.profession.length > 0) {
        query.profession = { $in: user.preferences.profession };
      }

      // Income range
      if (user.preferences.incomeRange) {
        query.annualIncome = {
          $gte: user.preferences.incomeRange.min,
          $lte: user.preferences.incomeRange.max
        };
      }
    }

    // Exclude already interested/rejected profiles
    const interests = await Interest.find({
      $or: [
        { fromUser: user._id },
        { toUser: user._id, status: 'Rejected' }
      ]
    }).select('toUser fromUser');

    const excludedUserIds = interests.map(i => 
      i.fromUser.toString() === user._id.toString() ? i.toUser : i.fromUser
    );

    query._id.$nin = [...excludedUserIds, ...(query._id.$nin || [])];

    // Get profiles
    let profiles = await User.find(query)
      .select('-password')
      .limit(50);

    // Calculate match scores
    profiles = profiles.map(profile => {
      const matchScore = calculateMatchScore(user, profile);
      return {
        ...profile.toObject(),
        matchScore
      };
    });

    // Sort by match score
    profiles.sort((a, b) => b.matchScore - a.matchScore);

    // Take top 20
    const suggestions = profiles.slice(0, 20);

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get interests received
// @route   GET /api/matches/interests/received
// @access  Private
exports.getReceivedInterests = async (req, res) => {
  try {
    const interests = await Interest.find({
      toUser: req.user.id,
      status: 'Pending'
    })
    .populate('fromUser', 'firstName lastName profilePhoto age education profession currentCity')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: interests.length,
      data: interests
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get interests sent
// @route   GET /api/matches/interests/sent
// @access  Private
exports.getSentInterests = async (req, res) => {
  try {
    const interests = await Interest.find({
      fromUser: req.user.id
    })
    .populate('toUser', 'firstName lastName profilePhoto age education profession currentCity')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: interests.length,
      data: interests
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get accepted matches
// @route   GET /api/matches/accepted
// @access  Private
exports.getAcceptedMatches = async (req, res) => {
  try {
    const interests = await Interest.find({
      $or: [
        { fromUser: req.user.id, status: 'Accepted' },
        { toUser: req.user.id, status: 'Accepted' }
      ]
    })
    .populate('fromUser toUser', 'firstName lastName profilePhoto age currentCity')
    .sort({ updatedAt: -1 });

    // Format to show matched user
    const matches = interests.map(interest => {
      const matchedUser = interest.fromUser._id.toString() === req.user.id.toString() 
        ? interest.toUser 
        : interest.fromUser;
      
      return {
        interestId: interest._id,
        matchedAt: interest.updatedAt,
        user: matchedUser
      };
    });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get match compatibility
// @route   GET /api/matches/compatibility/:userId
// @access  Private
exports.getCompatibility = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const otherUser = await User.findById(req.params.userId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const matchScore = calculateMatchScore(user, otherUser);
    
    // Calculate compatibility factors
    const compatibilityFactors = [
      {
        factor: 'Age Compatibility',
        score: 85,
        description: 'Age difference is ideal'
      },
      {
        factor: 'Education Level',
        score: 90,
        description: 'Similar educational background'
      },
      {
        factor: 'Location',
        score: 70,
        description: 'Same city match'
      },
      {
        factor: 'Interests',
        score: 60,
        description: 'Some common interests'
      },
      {
        factor: 'Family Background',
        score: 80,
        description: 'Similar family values'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        matchScore,
        compatibilityFactors,
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          age: user.age,
          education: user.education,
          profession: user.profession
        },
        otherUser: {
          id: otherUser._id,
          name: `${otherUser.firstName} ${otherUser.lastName}`,
          age: otherUser.age,
          education: otherUser.education,
          profession: otherUser.profession
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
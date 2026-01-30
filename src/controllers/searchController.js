const User = require('../models/User');

// @desc    Search profiles
// @route   POST /api/search
// @access  Private
exports.searchProfiles = async (req, res) => {
  try {
    const {
      gender,
      ageMin,
      ageMax,
      heightMin,
      heightMax,
      maritalStatus,
      education,
      profession,
      incomeMin,
      incomeMax,
      currentCity,
      currentState,
      subCommunity,
      gotra,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.body;

    // Build query
    let query = {};

    // Exclude current user
    query._id = { $ne: req.user.id };

    // Gender (opposite gender for matrimony)
    if (gender) {
      query.gender = gender === 'Male' ? 'Female' : 'Male';
    }

    // Age range
    if (ageMin || ageMax) {
      query.age = {};
      if (ageMin) query.age.$gte = parseInt(ageMin);
      if (ageMax) query.age.$lte = parseInt(ageMax);
    }

    // Height range
    if (heightMin || heightMax) {
      query.height = {};
      if (heightMin) query.height.$gte = parseInt(heightMin);
      if (heightMax) query.height.$lte = parseInt(heightMax);
    }

    // Marital status
    if (maritalStatus && maritalStatus.length > 0) {
      query.maritalStatus = { $in: maritalStatus };
    }

    // Education
    if (education && education.length > 0) {
      query.education = { $in: education };
    }

    // Profession
    if (profession && profession.length > 0) {
      query.profession = { $in: profession };
    }

    // Income range
    if (incomeMin || incomeMax) {
      query.annualIncome = {};
      if (incomeMin) query.annualIncome.$gte = parseInt(incomeMin);
      if (incomeMax) query.annualIncome.$lte = parseInt(incomeMax);
    }

    // Location
    if (currentCity) {
      query.currentCity = new RegExp(currentCity, 'i');
    }
    if (currentState) {
      query.currentState = new RegExp(currentState, 'i');
    }

    // Community specific
    if (subCommunity) {
      query.subCommunity = subCommunity;
    }
    if (gotra) {
      query.gotra = new RegExp(gotra, 'i');
    }

    // Only show active, non-blocked profiles
    query.isActive = true;
    query.isBlocked = false;
    query.isProfileComplete = true;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(query);

    // Apply privacy settings
    const filteredUsers = users.map(user => {
      const userObj = user.toObject();
      if (!user.privacy.showContactDetails) {
        delete userObj.phone;
        delete userObj.email;
      }
      if (!user.privacy.showIncome) {
        delete userObj.annualIncome;
      }
      return userObj;
    });

    res.status(200).json({
      success: true,
      count: filteredUsers.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: filteredUsers
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get advanced filters
// @route   GET /api/search/filters
// @access  Private
exports.getFilters = async (req, res) => {
  try {
    // Get distinct values for filters
    const education = await User.distinct('education');
    const profession = await User.distinct('profession');
    const cities = await User.distinct('currentCity');
    const states = await User.distinct('currentState');
    const subCommunities = await User.distinct('subCommunity');
    const gotras = await User.distinct('gotra');

    res.status(200).json({
      success: true,
      data: {
        education: education.filter(e => e).sort(),
        profession: profession.filter(p => p).sort(),
        cities: cities.filter(c => c).sort(),
        states: states.filter(s => s).sort(),
        subCommunities: subCommunities.filter(sc => sc).sort(),
        gotras: gotras.filter(g => g).sort()
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Quick search (for homepage)
// @route   GET /api/search/quick
// @access  Private
exports.quickSearch = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get opposite gender
    const gender = user.gender === 'Male' ? 'Female' : 'Male';
    
    // Get matches based on preferences
    const query = {
      gender,
      isActive: true,
      isBlocked: false,
      isProfileComplete: true,
      _id: { $ne: user._id }
    };

    // Add age filter from preferences
    if (user.preferences && user.preferences.ageRange) {
      query.age = {
        $gte: user.preferences.ageRange.min,
        $lte: user.preferences.ageRange.max
      };
    }

    // Limit to 10 profiles
    const profiles = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
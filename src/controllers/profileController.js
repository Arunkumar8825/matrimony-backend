const User = require('../models/User');
const Profile = require('../models/Profile');

// @desc    Get user profile
// @route   GET /api/profile/:userId
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('profile');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check privacy settings
    if (!user.privacy.showContactDetails && req.user.id !== userId) {
      user.phone = undefined;
      user.email = undefined;
    }

    // Increment profile views
    if (req.user.id !== userId) {
      // Add to profile visitors
      // This would require updating Profile model
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

// @desc    Update profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.email;
    delete updates.password;
    delete updates.isPremium;
    delete updates.isVerified;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    // Update profile completion percentage
    user.calculateProfileCompletion();
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/profile/photo
// @access  Private
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    const user = await User.findById(req.user.id);

    // Delete old photo from storage if exists
    if (user.profilePhoto && user.profilePhoto.public_id) {
      // Delete from Cloudinary or local storage
    }

    // Update user with new photo
    user.profilePhoto = {
      public_id: req.file.filename || req.file.public_id,
      url: req.file.path || req.file.url,
      isVerified: false
    };

    await user.save();

    res.status(200).json({
      success: true,
      data: user.profilePhoto,
      message: 'Profile photo uploaded successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Upload multiple photos
// @route   POST /api/profile/photos
// @access  Private
exports.uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload files'
      });
    }

    const user = await User.findById(req.user.id);

    const photos = req.files.map(file => ({
      public_id: file.filename || file.public_id,
      url: file.path || file.url,
      isVerified: false,
      uploadedAt: Date.now()
    }));

    // Limit to 10 photos
    user.photos = [...user.photos, ...photos].slice(0, 10);

    await user.save();

    res.status(200).json({
      success: true,
      data: user.photos,
      message: 'Photos uploaded successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete photo
// @route   DELETE /api/profile/photos/:photoId
// @access  Private
exports.deletePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const photoIndex = user.photos.findIndex(
      photo => photo._id.toString() === req.params.photoId
    );

    if (photoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }

    // Delete from storage
    const photo = user.photos[photoIndex];
    if (photo.public_id) {
      // Delete from Cloudinary or local storage
    }

    user.photos.splice(photoIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update privacy settings
// @route   PUT /api/profile/privacy
// @access  Private
exports.updatePrivacy = async (req, res) => {
  try {
    const { privacy } = req.body;

    const user = await User.findById(req.user.id);
    user.privacy = { ...user.privacy, ...privacy };
    await user.save();

    res.status(200).json({
      success: true,
      data: user.privacy,
      message: 'Privacy settings updated'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get profile completion
// @route   GET /api/profile/completion
// @access  Private
exports.getProfileCompletion = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const completion = user.calculateProfileCompletion();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        percentage: completion,
        isComplete: user.isProfileComplete,
        missingFields: [] // You can add logic to find missing fields
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
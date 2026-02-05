const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/helpers');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password, phone, firstName, lastName, gender, dateOfBirth } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or phone already exists'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      phone,
      firstName,
      lastName,
      gender,
      dateOfBirth
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    // In real app, store this token in database with expiry

    // Send verification email
    await sendEmail({
      email: user.email,
      subject: 'Verify Your Email - Yadhavar Matrimony',
      template: 'emailVerification',
      data: {
        name: user.firstName,
        verificationToken
      }
    });

    // Send verification SMS
    await sendSMS({
      to: user.phone,
      message: `Welcome to Yadhavar Matrimony. Your verification code is: ${verificationToken.substring(0, 6)}`
    });

    // Generate token
    const token = user.generateAuthToken();

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      token,
      data: user,
      message: 'Registration successful. Please verify your email.'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked. Try again later.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.accountLockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
      }
      
      await user.save();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      token,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      

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

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    const resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // In real app, save these to database
    // user.resetPasswordToken = resetPasswordToken;
    // user.resetPasswordExpire = resetPasswordExpire;
    // await user.save();

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    // Send email
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      template: 'passwordReset',
      data: {
        name: user.firstName,
        resetUrl
      }
    });

    res.status(200).json({
      success: true,
      message: 'Email sent'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // In real app, find user by token and check expiry
    // const user = await User.findOne({
    //   resetPasswordToken,
    //   resetPasswordExpire: { $gt: Date.now() }
    // });

    // if (!user) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Invalid or expired token'
    //   });
    // }

    // Set new password
    // user.password = req.body.password;
    // user.resetPasswordToken = undefined;
    // user.resetPasswordExpire = undefined;
    // await user.save();

    // Generate new token
    // const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
      // token in real app
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token,
      message: 'Password updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Private
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }

    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // In real app, you might blacklist the token
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
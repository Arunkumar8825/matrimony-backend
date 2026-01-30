const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { isValidIndianPhone } = require('./helpers');

// Common validation rules
const commonValidators = {
  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (value) => {
      const user = await User.findOne({ email: value });
      if (user) {
        throw new Error('Email already in use');
      }
    }),

  phone: body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian phone number')
    .custom(async (value) => {
      const user = await User.findOne({ phone: value });
      if (user) {
        throw new Error('Phone number already in use');
      }
    }),

  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),

  firstName: body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot be more than 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('First name can only contain letters and spaces'),

  lastName: body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot be more than 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Last name can only contain letters and spaces'),

  gender: body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),

  dateOfBirth: body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const dob = new Date(value);
      const age = new Date().getFullYear() - dob.getFullYear();
      
      if (age < 18) {
        throw new Error('You must be at least 18 years old');
      }
      if (age > 100) {
        throw new Error('Please provide a valid date of birth');
      }
      return true;
    }),

  height: body('height')
    .optional()
    .isInt({ min: 100, max: 250 })
    .withMessage('Height must be between 100cm and 250cm'),

  maritalStatus: body('maritalStatus')
    .optional()
    .isIn(['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'])
    .withMessage('Invalid marital status'),

  subCommunity: body('subCommunity')
    .isIn(['Golla', 'Kuruba', 'Gowda', 'Yadava', 'Other'])
    .withMessage('Please select a valid sub-community'),

  gotra: body('gotra')
    .trim()
    .notEmpty()
    .withMessage('Gotra is required')
    .isLength({ max: 50 })
    .withMessage('Gotra cannot be more than 50 characters'),

  education: body('education')
    .trim()
    .notEmpty()
    .withMessage('Education is required')
    .isLength({ max: 100 })
    .withMessage('Education cannot be more than 100 characters'),

  profession: body('profession')
    .trim()
    .notEmpty()
    .withMessage('Profession is required')
    .isLength({ max: 100 })
    .withMessage('Profession cannot be more than 100 characters'),

  currentCity: body('currentCity')
    .trim()
    .notEmpty()
    .withMessage('Current city is required')
    .isLength({ max: 50 })
    .withMessage('City name cannot be more than 50 characters'),

  currentState: body('currentState')
    .trim()
    .notEmpty()
    .withMessage('Current state is required')
    .isLength({ max: 50 })
    .withMessage('State name cannot be more than 50 characters'),

  nativePlace: body('nativePlace')
    .trim()
    .notEmpty()
    .withMessage('Native place is required')
    .isLength({ max: 100 })
    .withMessage('Native place cannot be more than 100 characters'),

  fatherName: body('fatherName')
    .trim()
    .notEmpty()
    .withMessage("Father's name is required")
    .isLength({ max: 100 })
    .withMessage("Father's name cannot be more than 100 characters"),

  motherName: body('motherName')
    .trim()
    .notEmpty()
    .withMessage("Mother's name is required")
    .isLength({ max: 100 })
    .withMessage("Mother's name cannot be more than 100 characters"),

  annualIncome: body('annualIncome')
    .optional()
    .isNumeric()
    .withMessage('Annual income must be a number')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Annual income cannot be negative');
      }
      return true;
    }),

  aboutMe: body('aboutMe')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('About me cannot exceed 1000 characters'),

  partnerExpectations: body('partnerExpectations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Partner expectations cannot exceed 1000 characters'),

  diet: body('diet')
    .optional()
    .isIn(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'])
    .withMessage('Invalid diet preference'),

  smoking: body('smoking')
    .optional()
    .isIn(['No', 'Occasionally', 'Yes'])
    .withMessage('Invalid smoking preference'),

  drinking: body('drinking')
    .optional()
    .isIn(['No', 'Occasionally', 'Yes'])
    .withMessage('Invalid drinking preference')
};

// Validation chains for different routes
const authValidators = {
  register: [
    commonValidators.email,
    commonValidators.password,
    commonValidators.phone,
    commonValidators.firstName,
    commonValidators.lastName,
    commonValidators.gender,
    commonValidators.dateOfBirth,
    commonValidators.subCommunity,
    commonValidators.gotra
  ],

  login: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],

  forgotPassword: [
    body('email').isEmail().withMessage('Please provide a valid email')
  ],

  resetPassword: [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
  ],

  updatePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ]
};

const profileValidators = {
  updateProfile: [
    commonValidators.firstName.optional(),
    commonValidators.lastName.optional(),
    commonValidators.dateOfBirth.optional(),
    commonValidators.height.optional(),
    commonValidators.maritalStatus.optional(),
    commonValidators.education.optional(),
    commonValidators.profession.optional(),
    commonValidators.currentCity.optional(),
    commonValidators.currentState.optional(),
    commonValidators.nativePlace.optional(),
    commonValidators.fatherName.optional(),
    commonValidators.motherName.optional(),
    commonValidators.annualIncome.optional(),
    commonValidators.aboutMe.optional(),
    commonValidators.partnerExpectations.optional(),
    commonValidators.diet.optional(),
    commonValidators.smoking.optional(),
    commonValidators.drinking.optional(),

    body('photos').optional().isArray().withMessage('Photos must be an array'),
    body('photos.*').optional().isURL().withMessage('Invalid photo URL'),

    body('preferences.ageRange.min')
      .optional()
      .isInt({ min: 18, max: 100 })
      .withMessage('Minimum age must be between 18 and 100'),
    
    body('preferences.ageRange.max')
      .optional()
      .isInt({ min: 18, max: 100 })
      .withMessage('Maximum age must be between 18 and 100')
      .custom((value, { req }) => {
        if (req.body.preferences?.ageRange?.min && value < req.body.preferences.ageRange.min) {
          throw new Error('Maximum age must be greater than minimum age');
        }
        return true;
      }),

    body('preferences.heightRange.min')
      .optional()
      .isInt({ min: 100, max: 250 })
      .withMessage('Minimum height must be between 100cm and 250cm'),
    
    body('preferences.heightRange.max')
      .optional()
      .isInt({ min: 100, max: 250 })
      .withMessage('Maximum height must be between 100cm and 250cm')
      .custom((value, { req }) => {
        if (req.body.preferences?.heightRange?.min && value < req.body.preferences.heightRange.min) {
          throw new Error('Maximum height must be greater than minimum height');
        }
        return true;
      })
  ],

  updatePrivacy: [
    body('privacy.showProfilePhoto')
      .optional()
      .isBoolean()
      .withMessage('showProfilePhoto must be a boolean'),
    
    body('privacy.showContactDetails')
      .optional()
      .isBoolean()
      .withMessage('showContactDetails must be a boolean'),
    
    body('privacy.showIncome')
      .optional()
      .isBoolean()
      .withMessage('showIncome must be a boolean'),
    
    body('privacy.visibleTo')
      .optional()
      .isIn(['All', 'Premium', 'Selected'])
      .withMessage('visibleTo must be All, Premium, or Selected')
  ]
};

const searchValidators = {
  searchProfiles: [
    body('gender').optional().isIn(['Male', 'Female']).withMessage('Invalid gender'),
    body('ageMin').optional().isInt({ min: 18, max: 100 }).withMessage('Minimum age must be between 18 and 100'),
    body('ageMax').optional().isInt({ min: 18, max: 100 }).withMessage('Maximum age must be between 18 and 100'),
    body('heightMin').optional().isInt({ min: 100, max: 250 }).withMessage('Minimum height must be between 100cm and 250cm'),
    body('heightMax').optional().isInt({ min: 100, max: 250 }).withMessage('Maximum height must be between 100cm and 250cm'),
    body('incomeMin').optional().isNumeric().withMessage('Minimum income must be a number'),
    body('incomeMax').optional().isNumeric().withMessage('Maximum income must be a number'),
    body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]
};

const matchValidators = {
  sendInterest: [
    body('toUserId')
      .notEmpty()
      .withMessage('User ID is required')
      .isMongoId()
      .withMessage('Invalid user ID'),
    
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    
    body('type')
      .optional()
      .isIn(['Interest', 'Shortlisted', 'Declined', 'Blocked'])
      .withMessage('Invalid interest type')
  ],

  respondToInterest: [
    body('status')
      .isIn(['Accepted', 'Rejected'])
      .withMessage('Status must be Accepted or Rejected')
  ]
};

const chatValidators = {
  sendMessage: [
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 2000 })
      .withMessage('Message cannot exceed 2000 characters'),
    
    body('type')
      .optional()
      .isIn(['text', 'image', 'document', 'audio'])
      .withMessage('Invalid message type')
  ],

  getOrCreateChat: [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isMongoId()
      .withMessage('Invalid user ID')
  ]
};

const paymentValidators = {
  createOrder: [
    body('plan')
      .notEmpty()
      .withMessage('Plan is required')
      .isIn(['Basic', 'Gold', 'Platinum'])
      .withMessage('Invalid plan'),
    
    body('duration')
      .notEmpty()
      .withMessage('Duration is required')
      .isInt({ min: 1, max: 12 })
      .withMessage('Duration must be between 1 and 12 months')
  ],

  verifyPayment: [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    body('paymentId').notEmpty().isMongoId().withMessage('Valid payment ID is required')
  ]
};

const adminValidators = {
  createAdmin: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .isIn(['superadmin', 'admin', 'moderator', 'support'])
      .withMessage('Invalid role'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array')
  ],

  updateUserStatus: [
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('isBlocked').optional().isBoolean().withMessage('isBlocked must be a boolean'),
    body('verificationStatus')
      .optional()
      .isIn(['Pending', 'Under Review', 'Verified', 'Rejected'])
      .withMessage('Invalid verification status')
  ]
};

const horoscopeValidators = {
  saveHoroscope: [
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    
    body('timeOfBirth')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Please provide time in HH:MM format'),
    
    body('placeOfBirth')
      .notEmpty()
      .withMessage('Place of birth is required'),
    
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude')
  ],

  getHoroscopeMatch: [
    body('partnerUserId')
      .notEmpty()
      .withMessage('Partner user ID is required')
      .isMongoId()
      .withMessage('Invalid user ID')
  ]
};

// Helper function to validate request
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'Only JPEG, PNG, GIF, and WebP images are allowed'
    });
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File size must be less than 5MB'
    });
  }

  next();
};

module.exports = {
  authValidators,
  profileValidators,
  searchValidators,
  matchValidators,
  chatValidators,
  paymentValidators,
  adminValidators,
  horoscopeValidators,
  validate,
  validateFileUpload,
  commonValidators
};
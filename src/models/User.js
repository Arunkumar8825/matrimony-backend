const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Account Information
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    unique: true
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'Please provide first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please provide last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  age: {
    type: Number
  },
  height: {
    type: Number, // in cm
    min: [100, 'Height must be at least 100cm'],
    max: [250, 'Height cannot exceed 250cm']
  },
  maritalStatus: {
    type: String,
    enum: ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'],
    default: 'Never Married'
  },
  
  // Yadhavar Community Specific
  community: {
    type: String,
    default: 'Yadhavar'
  },
  subCommunity: {
    type: String,
    enum: ['Golla', 'Kuruba', 'Gowda', 'Yadava', 'Other'],
    required: false
  },
  gotra: {
    type: String,
    required: false
  },
  nativePlace: {
    type: String,
    required: false
  },
  
  // Professional Details
  education: {
    type: String,
    required: false
  },
  university: {
    type: String
  },
  profession: {
    type: String,
    required: false
  },
  company: {
    type: String
  },
  annualIncome: {
    type: Number,
    min: 0
  },
  
  // Family Details
  fatherName: {
    type: String,
    required: false
  },
  fatherOccupation: {
    type: String
  },
  motherName: {
    type: String,
    required: false
  },
  motherOccupation: {
    type: String
  },
  siblings: {
    type: String // "1 brother, 2 sisters"
  },
  familyType: {
    type: String,
    enum: ['Joint', 'Nuclear', 'Other']
  },
  familyStatus: {
    type: String,
    enum: ['Middle Class', 'Upper Middle Class', 'Affluent', 'Other']
  },
  
  // Location
  currentCity: {
    type: String,
    required: false
  },
  currentState: {
    type: String,
    required: false
  },
  currentCountry: {
    type: String,
    default: 'India'
  },
  willingToRelocate: {
    type: Boolean,
    default: false
  },
  
  // Lifestyle
  diet: {
    type: String,
    enum: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']
  },
  smoking: {
    type: String,
    enum: ['No', 'Occasionally', 'Yes']
  },
  drinking: {
    type: String,
    enum: ['No', 'Occasionally', 'Yes']
  },
  
  // About Me
  aboutMe: {
    type: String,
    maxlength: [1000, 'About me cannot be more than 1000 characters']
  },
  partnerExpectations: {
    type: String,
    maxlength: [1000, 'Expectations cannot be more than 1000 characters']
  },
  
  // Preferences
  preferences: {
    ageRange: {
      min: { type: Number, default: 21 },
      max: { type: Number, default: 40 }
    },
    heightRange: {
      min: { type: Number, default: 150 },
      max: { type: Number, default: 200 }
    },
    maritalStatus: [String],
    education: [String],
    profession: [String],
    incomeRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10000000 }
    }
  },
  
  // Account Settings
  profilePhoto: {
    public_id: String,
    url: String,
    isVerified: { type: Boolean, default: false }
  },
  photos: [{
    public_id: String,
    url: String,
    isVerified: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
  }],
  profileCompletePercentage: {
    type: Number,
    default: 0
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isProfileVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Under Review', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  
  // Subscription
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumType: {
    type: String,
    enum: ['None', 'Basic', 'Gold', 'Platinum'],
    default: 'None'
  },
  premiumExpiresAt: {
    type: Date
  },
  
  // Privacy Settings
  privacy: {
    showProfilePhoto: { type: Boolean, default: true },
    showContactDetails: { type: Boolean, default: false },
    showIncome: { type: Boolean, default: false },
    visibleTo: { type: String, enum: ['All', 'Premium', 'Selected'], default: 'All' }
  },
  
  // Security
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate age before saving
userSchema.pre('save', function(next) {
  if (this.dateOfBirth) {
    const birthDate = new Date(this.dateOfBirth);
    const difference = Date.now() - birthDate.getTime();
    const age = new Date(difference).getUTCFullYear() - 1970;
    this.age = age;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update profile completion percentage
userSchema.methods.calculateProfileCompletion = function() {
  let completion = 0;
  const totalFields = 20; // Adjust based on important fields
  
  if (this.email) completion += 5;
  if (this.phone) completion += 5;
  if (this.firstName && this.lastName) completion += 5;
  if (this.gender) completion += 5;
  if (this.dateOfBirth) completion += 5;
  if (this.height) completion += 5;
  if (this.education) completion += 5;
  if (this.profession) completion += 5;
  if (this.profilePhoto && this.profilePhoto.url) completion += 10;
  if (this.photos && this.photos.length > 0) completion += 5;
  if (this.aboutMe) completion += 5;
  if (this.currentCity) completion += 5;
  if (this.nativePlace) completion += 5;
  if (this.subCommunity) completion += 5;
  if (this.gotra) completion += 5;
  if (this.fatherName) completion += 5;
  if (this.motherName) completion += 5;
  if (this.annualIncome) completion += 5;
  if (this.preferences) completion += 5;
  
  this.profileCompletePercentage = Math.min(completion, 100);
  this.isProfileComplete = this.profileCompletePercentage >= 70;
  return this.profileCompletePercentage;
};

// Generate JWT Token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, isPremium: this.isPremium },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);
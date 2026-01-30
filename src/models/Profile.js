const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Extended Details
  hobbies: [{
    type: String
  }],
  interests: [{
    type: String
  }],
  languages: [{
    language: String,
    proficiency: { type: String, enum: ['Basic', 'Intermediate', 'Fluent', 'Native'] }
  }],
  
  // Physical Appearance
  bodyType: {
    type: String,
    enum: ['Slim', 'Athletic', 'Average', 'Heavy']
  },
  complexion: {
    type: String,
    enum: ['Very Fair', 'Fair', 'Wheatish', 'Dark']
  },
  physicalStatus: {
    type: String,
    enum: ['Normal', 'Physically Challenged']
  },
  
  // Religious Background
  religion: {
    type: String,
    default: 'Hindu'
  },
  caste: {
    type: String,
    default: 'Yadhavar'
  },
  star: {
    type: String // Nakshatra
  },
  rashi: {
    type: String // Zodiac sign
  },
  gothram: {
    type: String
  },
  
  // Horoscope Details
  timeOfBirth: {
    type: String // HH:MM format
  },
  placeOfBirth: {
    type: String
  },
  manglik: {
    type: String,
    enum: ['Yes', 'No', 'Partial']
  },
  
  // Education Details
  educationDetails: [{
    degree: String,
    specialization: String,
    university: String,
    year: Number,
    grade: String
  }],
  
  // Career Details
  workExperience: [{
    company: String,
    designation: String,
    location: String,
    from: Date,
    to: Date,
    current: Boolean,
    description: String
  }],
  
  // Family Details Extended
  familyValues: {
    type: String,
    enum: ['Traditional', 'Moderate', 'Liberal']
  },
  familyOrigin: {
    type: String
  },
  ancestralProperty: {
    type: String
  },
  
  // Lifestyle Extended
  workout: {
    type: String,
    enum: ['Regularly', 'Occasionally', 'Never']
  },
  yogaMeditation: {
    type: Boolean,
    default: false
  },
  
  // Partner Expectations Detailed
  expectations: {
    aboutPartner: String,
    familyValues: String,
    careerOriented: Boolean,
    settleAbroad: Boolean
  },
  
  // Statistics
  profileViews: {
    type: Number,
    default: 0
  },
  profileVisitors: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Verification Documents
  documents: [{
    documentType: {
      type: String,
      enum: ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Educational', 'Income']
    },
    documentNumber: String,
    frontImage: {
      public_id: String,
      url: String
    },
    backImage: {
      public_id: String,
      url: String
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Last Updated
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastUpdated on save
profileSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Profile', profileSchema);
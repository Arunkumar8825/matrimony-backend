const mongoose = require('mongoose');

const horoscopeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  timeOfBirth: {
    type: String,
    required: true
  },
  placeOfBirth: {
    type: String,
    required: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  // Birth Chart Details
  lagna: {
    type: String
  },
  rashi: {
    type: String
  },
  nakshatra: {
    type: String
  },
  nakshatraPada: {
    type: Number
  },
  moonSign: {
    type: String
  },
  sunSign: {
    type: String
  },
  manglik: {
    type: Boolean,
    default: false
  },
  // Planet Positions
  planets: {
    type: Map,
    of: String
  },
  // Kundli Details
  kundliImage: {
    public_id: String,
    url: String
  },
  kundliText: {
    type: String
  },
  // Match Points
  matchPoints: {
    type: Number,
    min: 0,
    max: 36
  },
  // Compatibility Factors
  compatibilityFactors: [{
    factor: String,
    score: Number,
    description: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Horoscope', horoscopeSchema);
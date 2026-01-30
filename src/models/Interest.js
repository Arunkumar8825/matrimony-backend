const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Interest', 'Shortlisted', 'Declined', 'Blocked'],
    default: 'Interest'
  },
  message: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'],
    default: 'Pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  respondedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days
  }
}, {
  timestamps: true
});

// Ensure one interest per pair
interestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

// Auto-delete expired interests
interestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Interest', interestSchema);
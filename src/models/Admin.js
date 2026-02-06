const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ['superadmin', 'admin', 'moderator', 'support'],
      default: 'admin'
    },

    permissions: [
      {
        module: String,
        actions: [String]
      }
    ],

    isActive: {
      type: Boolean,
      default: true
    },

    lastLogin: {
      type: Date
    },

    loginAttempts: {
      type: Number,
      default: 0
    },

    accountLockedUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

//
// 🔐 Hash password before save
//
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//
// 🔑 Compare entered password
//
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//
// 🚫 Check if account is locked
//
adminSchema.methods.isAccountLocked = function () {
  if (!this.accountLockedUntil) return false;
  return this.accountLockedUntil > Date.now();
};

module.exports = mongoose.model('Admin', adminSchema);

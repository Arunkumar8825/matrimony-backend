const crypto = require('crypto');
const twilio = require('twilio');

// Generate random string
exports.generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

// Format date
exports.formatDate = (date, format = 'DD/MM/YYYY') => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  }
  return date;
};

// Calculate age from date of birth
exports.calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const difference = Date.now() - birthDate.getTime();
  const age = new Date(difference).getUTCFullYear() - 1970;
  return age;
};

// Send SMS using Twilio
exports.sendSMS = async ({ to, message }) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('SMS not sent - Twilio credentials not configured');
      return null;
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent:', response.sid);
    return response;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return null;
  }
};

// Generate OTP
exports.generateOTP = (length = 6) => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

// Validate Indian phone number
exports.isValidIndianPhone = (phone) => {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone);
};

// Pagination helper
exports.paginate = (model, query, page = 1, limit = 10, populate = '') => {
  const skip = (page - 1) * limit;
  
  return model.find(query)
    .populate(populate)
    .skip(skip)
    .limit(limit);
};

// Calculate distance between two coordinates (Haversine formula)
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Slugify string
exports.slugify = (text) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

// Delay function
exports.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
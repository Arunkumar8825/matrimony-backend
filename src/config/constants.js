module.exports = {
  // User roles
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'superadmin',
    MODERATOR: 'moderator'
  },

  // Gender options
  GENDER: {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
  },

  // Marital status
  MARITAL_STATUS: [
    'Never Married',
    'Divorced',
    'Widowed',
    'Awaiting Divorce'
  ],

  // Sub-communities for Yadhavar
  SUB_COMMUNITIES: [
    'Golla',
    'Kuruba',
    'Gowda',
    'Yadava',
    'Other'
  ],

  // Education levels
  EDUCATION_LEVELS: [
    '10th',
    '12th',
    'Diploma',
    'Graduate',
    'Post Graduate',
    'PhD',
    'Other'
  ],

  // Profession categories
  PROFESSIONS: [
    'Doctor',
    'Engineer',
    'Teacher',
    'Government Employee',
    'Private Employee',
    'Business',
    'Self Employed',
    'Student',
    'Other'
  ],

  // Diet preferences
  DIET: [
    'Vegetarian',
    'Non-Vegetarian',
    'Eggetarian',
    'Vegan'
  ],

  // Family types
  FAMILY_TYPES: [
    'Joint',
    'Nuclear',
    'Other'
  ],

  // Family status
  FAMILY_STATUS: [
    'Middle Class',
    'Upper Middle Class',
    'Affluent',
    'Other'
  ],

  // Body types
  BODY_TYPES: [
    'Slim',
    'Athletic',
    'Average',
    'Heavy'
  ],

  // Complexion
  COMPLEXION: [
    'Very Fair',
    'Fair',
    'Wheatish',
    'Dark'
  ],

  // Smoking/Drinking habits
  HABITS: ['No', 'Occasionally', 'Yes'],

  // Subscription plans
  SUBSCRIPTION_PLANS: {
    BASIC: {
      name: 'Basic',
      duration: 1, // months
      price: 999,
      features: [
        'View unlimited profiles',
        'Send 10 interests per month',
        'Basic search filters',
        'Profile highlighting'
      ]
    },
    GOLD: {
      name: 'Gold',
      duration: 3,
      price: 2499,
      features: [
        'All Basic features',
        'Send unlimited interests',
        'Advanced search filters',
        'Priority customer support',
        'Horoscope matching'
      ]
    },
    PLATINUM: {
      name: 'Platinum',
      duration: 12,
      price: 8999,
      features: [
        'All Gold features',
        'Profile verification badge',
        'Featured listing',
        'Video call access',
        'Personal matchmaking assistance'
      ]
    }
  },

  // Match score thresholds
  MATCH_SCORE: {
    EXCELLENT: 80,
    GOOD: 60,
    AVERAGE: 40,
    POOR: 20
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // File upload limits (in bytes)
  FILE_LIMITS: {
    PROFILE_PHOTO: 5 * 1024 * 1024, // 5MB
    DOCUMENT: 10 * 1024 * 1024, // 10MB
    CHAT_IMAGE: 2 * 1024 * 1024 // 2MB
  },

  // Allowed file types
  ALLOWED_FILE_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 3600, // 1 hour
    LONG: 86400 // 24 hours
  }
};
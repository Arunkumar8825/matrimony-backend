const Horoscope = require('../models/Horoscope');
const User = require('../models/User');

// @desc    Save horoscope details
// @route   POST /api/horoscope
// @access  Private
exports.saveHoroscope = async (req, res) => {
  try {
    const {
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      latitude,
      longitude
    } = req.body;

    // Check if user already has horoscope
    const existingHoroscope = await Horoscope.findOne({ user: req.user.id });
    
    if (existingHoroscope) {
      return res.status(400).json({
        success: false,
        error: 'Horoscope already exists for this user'
      });
    }

    // Calculate horoscope details (simplified version)
    // In production, you would integrate with a proper astrology API
    const horoscopeData = await calculateHoroscopeDetails({
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      latitude,
      longitude
    });

    // Create horoscope record
    const horoscope = await Horoscope.create({
      user: req.user.id,
      dateOfBirth: new Date(dateOfBirth),
      timeOfBirth,
      placeOfBirth,
      latitude,
      longitude,
      ...horoscopeData
    });

    res.status(201).json({
      success: true,
      data: horoscope,
      message: 'Horoscope details saved successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get horoscope details
// @route   GET /api/horoscope
// @access  Private
exports.getHoroscope = async (req, res) => {
  try {
    const horoscope = await Horoscope.findOne({ user: req.user.id });

    if (!horoscope) {
      return res.status(404).json({
        success: false,
        error: 'Horoscope not found'
      });
    }

    res.status(200).json({
      success: true,
      data: horoscope
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Update horoscope details
// @route   PUT /api/horoscope
// @access  Private
exports.updateHoroscope = async (req, res) => {
  try {
    const {
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      latitude,
      longitude
    } = req.body;

    let horoscope = await Horoscope.findOne({ user: req.user.id });

    if (!horoscope) {
      return res.status(404).json({
        success: false,
        error: 'Horoscope not found'
      });
    }

    // Recalculate horoscope if birth details changed
    if (dateOfBirth || timeOfBirth || placeOfBirth) {
      const newData = {
        dateOfBirth: dateOfBirth || horoscope.dateOfBirth,
        timeOfBirth: timeOfBirth || horoscope.timeOfBirth,
        placeOfBirth: placeOfBirth || horoscope.placeOfBirth,
        latitude: latitude || horoscope.latitude,
        longitude: longitude || horoscope.longitude
      };

      const horoscopeData = await calculateHoroscopeDetails(newData);
      
      // Update horoscope
      horoscope = await Horoscope.findOneAndUpdate(
        { user: req.user.id },
        { ...newData, ...horoscopeData },
        { new: true, runValidators: true }
      );
    } else {
      // Update other fields
      horoscope = await Horoscope.findOneAndUpdate(
        { user: req.user.id },
        req.body,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      data: horoscope,
      message: 'Horoscope updated successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get horoscope match
// @route   POST /api/horoscope/match
// @access  Private
exports.getHoroscopeMatch = async (req, res) => {
  try {
    const { partnerUserId } = req.body;

    // Get user's horoscope
    const userHoroscope = await Horoscope.findOne({ user: req.user.id });
    
    if (!userHoroscope) {
      return res.status(400).json({
        success: false,
        error: 'Please complete your horoscope details first'
      });
    }

    // Get partner's horoscope
    const partnerHoroscope = await Horoscope.findOne({ user: partnerUserId });
    
    if (!partnerHoroscope) {
      return res.status(400).json({
        success: false,
        error: 'Partner has not provided horoscope details'
      });
    }

    // Calculate match score
    const matchScore = calculateHoroscopeMatch(
      userHoroscope,
      partnerHoroscope
    );

    // Get compatibility factors
    const compatibilityFactors = getCompatibilityFactors(
      userHoroscope,
      partnerHoroscope
    );

    // Overall assessment
    const assessment = getMatchAssessment(matchScore);

    res.status(200).json({
      success: true,
      data: {
        matchScore,
        assessment,
        compatibilityFactors,
        userHoroscope: {
          rashi: userHoroscope.rashi,
          nakshatra: userHoroscope.nakshatra,
          manglik: userHoroscope.manglik
        },
        partnerHoroscope: {
          rashi: partnerHoroscope.rashi,
          nakshatra: partnerHoroscope.nakshatra,
          manglik: partnerHoroscope.manglik
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Upload horoscope image
// @route   POST /api/horoscope/upload
// @access  Private
exports.uploadHoroscopeImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    const horoscope = await Horoscope.findOne({ user: req.user.id });

    if (!horoscope) {
      return res.status(404).json({
        success: false,
        error: 'Horoscope not found'
      });
    }

    // Delete old image if exists
    if (horoscope.kundliImage && horoscope.kundliImage.public_id) {
      // Delete from Cloudinary or local storage
    }

    // Update horoscope with new image
    horoscope.kundliImage = {
      public_id: req.file.filename || req.file.public_id,
      url: req.file.path || req.file.url
    };

    await horoscope.save();

    res.status(200).json({
      success: true,
      data: horoscope.kundliImage,
      message: 'Horoscope image uploaded successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Helper function to calculate horoscope details
async function calculateHoroscopeDetails(birthDetails) {
  // This is a simplified version
  // In production, integrate with astrology API like https://www.astrologyapi.com/
  
  const { dateOfBirth } = birthDetails;
  const dob = new Date(dateOfBirth);
  const month = dob.getMonth() + 1;
  const day = dob.getDate();

  // Simple zodiac calculation
  const zodiacSigns = [
    { name: 'Aries', start: { month: 3, day: 21 }, end: { month: 4, day: 19 } },
    { name: 'Taurus', start: { month: 4, day: 20 }, end: { month: 5, day: 20 } },
    { name: 'Gemini', start: { month: 5, day: 21 }, end: { month: 6, day: 20 } },
    { name: 'Cancer', start: { month: 6, day: 21 }, end: { month: 7, day: 22 } },
    { name: 'Leo', start: { month: 7, day: 23 }, end: { month: 8, day: 22 } },
    { name: 'Virgo', start: { month: 8, day: 23 }, end: { month: 9, day: 22 } },
    { name: 'Libra', start: { month: 9, day: 23 }, end: { month: 10, day: 22 } },
    { name: 'Scorpio', start: { month: 10, day: 23 }, end: { month: 11, day: 21 } },
    { name: 'Sagittarius', start: { month: 11, day: 22 }, end: { month: 12, day: 21 } },
    { name: 'Capricorn', start: { month: 12, day: 22 }, end: { month: 1, day: 19 } },
    { name: 'Aquarius', start: { month: 1, day: 20 }, end: { month: 2, day: 18 } },
    { name: 'Pisces', start: { month: 2, day: 19 }, end: { month: 3, day: 20 } }
  ];

  let rashi = 'Unknown';
  for (const sign of zodiacSigns) {
    if ((month === sign.start.month && day >= sign.start.day) ||
        (month === sign.end.month && day <= sign.end.day)) {
      rashi = sign.name;
      break;
    }
  }

  // Simple nakshatra calculation based on moon position (simplified)
  const nakshatras = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
    'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ];

  const nakshatraIndex = Math.floor(Math.random() * nakshatras.length);
  const nakshatra = nakshatras[nakshatraIndex];
  const nakshatraPada = Math.floor(Math.random() * 4) + 1;

  // Simple manglik calculation (based on rashi)
  const manglikRashis = ['Aries', 'Leo', 'Scorpio', 'Aquarius'];
  const manglik = manglikRashis.includes(rashi);

  return {
    rashi,
    nakshatra,
    nakshatraPada,
    manglik,
    planets: {
      sun: rashi,
      moon: 'Cancer', // Simplified
      mars: 'Aries'
    },
    matchPoints: Math.floor(Math.random() * 36) + 1
  };
}

// Helper function to calculate horoscope match score
function calculateHoroscopeMatch(horoscope1, horoscope2) {
  let score = 0;
  const maxScore = 36;

  // Rashi compatibility (12 points)
  const rashiCompatiblity = {
    'Aries': ['Leo', 'Sagittarius', 'Gemini', 'Aquarius'],
    'Taurus': ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
    'Gemini': ['Libra', 'Aquarius', 'Aries', 'Leo'],
    'Cancer': ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
    'Leo': ['Sagittarius', 'Aries', 'Gemini', 'Libra'],
    'Virgo': ['Capricorn', 'Taurus', 'Cancer', 'Scorpio'],
    'Libra': ['Aquarius', 'Gemini', 'Leo', 'Sagittarius'],
    'Scorpio': ['Pisces', 'Cancer', 'Virgo', 'Capricorn'],
    'Sagittarius': ['Aries', 'Leo', 'Libra', 'Aquarius'],
    'Capricorn': ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
    'Aquarius': ['Gemini', 'Libra', 'Aries', 'Sagittarius'],
    'Pisces': ['Cancer', 'Scorpio', 'Taurus', 'Capricorn']
  };

  if (rashiCompatiblity[horoscope1.rashi]?.includes(horoscope2.rashi)) {
    score += 12;
  } else if (horoscope1.rashi === horoscope2.rashi) {
    score += 8;
  } else {
    score += 4;
  }

  // Nakshatra compatibility (8 points)
  // This is simplified - actual nakshatra matching is complex
  if (horoscope1.nakshatra === horoscope2.nakshatra) {
    score += 4;
  } else {
    score += 6; // Different nakshatras are often better
  }

  // Manglik compatibility (8 points)
  if (horoscope1.manglik && horoscope2.manglik) {
    score += 8; // Both manglik - good match
  } else if (!horoscope1.manglik && !horoscope2.manglik) {
    score += 8; // Both non-manglik - good match
  } else if (horoscope1.manglik && !horoscope2.manglik) {
    score += 2; // Manglik with non-manglik - needs remedies
  } else {
    score += 2; // Non-manglik with manglik - needs remedies
  }

  // Nakshatra pada compatibility (4 points)
  if (horoscope1.nakshatraPada === horoscope2.nakshatraPada) {
    score += 2;
  } else {
    score += 4; // Different padas are often better
  }

  // Planet positions (4 points)
  // Simplified - check if sun signs are compatible
  if (horoscope1.planets?.sun && horoscope2.planets?.sun) {
    if (horoscope1.planets.sun === horoscope2.planets.sun) {
      score += 2;
    } else {
      score += 3;
    }
  }

  return Math.min(score, maxScore);
}

// Helper function to get compatibility factors
function getCompatibilityFactors(horoscope1, horoscope2) {
  return [
    {
      factor: 'Rashi Compatibility',
      score: 85,
      description: `${horoscope1.rashi} and ${horoscope2.rashi} are compatible`
    },
    {
      factor: 'Nakshatra Match',
      score: 75,
      description: `${horoscope1.nakshatra} and ${horoscope2.nakshatra} create harmonious energy`
    },
    {
      factor: 'Manglik Status',
      score: horoscope1.manglik === horoscope2.manglik ? 90 : 40,
      description: horoscope1.manglik === horoscope2.manglik ?
        'Manglik status matches perfectly' :
        'Manglik mismatch may require remedies'
    },
    {
      factor: 'Nakshatra Pada',
      score: 70,
      description: `Pada ${horoscope1.nakshatraPada} and Pada ${horoscope2.nakshatraPada} combination`
    },
    {
      factor: 'Overall Harmony',
      score: 80,
      description: 'Good overall planetary alignment'
    }
  ];
}

// Helper function to get match assessment
function getMatchAssessment(score) {
  if (score >= 30) {
    return {
      level: 'Excellent',
      description: 'Highly compatible match with strong horoscope alignment',
      recommendation: 'Highly recommended for marriage'
    };
  } else if (score >= 24) {
    return {
      level: 'Good',
      description: 'Good compatibility with minor considerations',
      recommendation: 'Recommended with some remedies if needed'
    };
  } else if (score >= 18) {
    return {
      level: 'Average',
      description: 'Average compatibility, needs careful consideration',
      recommendation: 'Consult an astrologer for detailed analysis'
    };
  } else {
    return {
      level: 'Poor',
      description: 'Low compatibility, significant differences',
      recommendation: 'Not recommended without proper remedies'
    };
  }
}
const axios = require('axios');

/**
 * Horoscope Calculator Utility
 * For calculating astrological details and compatibility
 */

class HoroscopeCalculator {
  constructor() {
    this.astrologyAPIKey = process.env.ASTROLOGY_API_KEY || '';
    this.useMockData = !this.astrologyAPIKey;
  }

  /**
   * Calculate all horoscope details from birth information
   * @param {Object} birthDetails - Birth information
   * @returns {Promise<Object>} Horoscope details
   */
  async calculateHoroscopeDetails(birthDetails) {
    const {
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      latitude,
      longitude
    } = birthDetails;

    if (this.useMockData) {
      return this.calculateMockHoroscope(birthDetails);
    }

    try {
      // Integration with external astrology API (example using astrologyapi.com)
      return await this.callAstrologyAPI(birthDetails);
    } catch (error) {
      console.error('Astrology API error, using mock data:', error.message);
      return this.calculateMockHoroscope(birthDetails);
    }
  }

  /**
   * Call external astrology API
   */
  async callAstrologyAPI(birthDetails) {
    const apiUrl = 'https://json.astrologyapi.com/v1';
    
    const payload = {
      day: new Date(birthDetails.dateOfBirth).getDate(),
      month: new Date(birthDetails.dateOfBirth).getMonth() + 1,
      year: new Date(birthDetails.dateOfBirth).getFullYear(),
      hour: parseInt(birthDetails.timeOfBirth.split(':')[0]),
      min: parseInt(birthDetails.timeOfBirth.split(':')[1]),
      lat: birthDetails.latitude,
      lon: birthDetails.longitude,
      tzone: 5.5 // IST
    };

    const auth = {
      username: 'your_user_id',
      password: this.astrologyAPIKey
    };

    // Get basic birth details
    const [birthDetailsRes, planetaryPositionsRes] = await Promise.all([
      axios.post(`${apiUrl}/birth_details`, payload, { auth }),
      axios.post(`${apiUrl}/planetary_positions`, payload, { auth })
    ]);

    return {
      rashi: birthDetailsRes.data.zodiac,
      nakshatra: birthDetailsRes.data.nakshatra,
      nakshatraPada: birthDetailsRes.data.nakshatra_pada,
      manglik: this.checkManglik(planetaryPositionsRes.data),
      planets: this.extractPlanetDetails(planetaryPositionsRes.data),
      matchPoints: this.calculateMatchPoints(birthDetailsRes.data),
      ascendant: birthDetailsRes.data.ascendant,
      moonSign: birthDetailsRes.data.moon_sign,
      sunSign: birthDetailsRes.data.sun_sign,
      chartData: planetaryPositionsRes.data
    };
  }

  /**
   * Calculate mock horoscope data (for development/testing)
   */
  calculateMockHoroscope(birthDetails) {
    const { dateOfBirth } = birthDetails;
    const dob = new Date(dateOfBirth);
    const month = dob.getMonth() + 1;
    const day = dob.getDate();
    const year = dob.getFullYear();

    // Calculate Rashi (Moon Sign)
    const rashi = this.calculateRashi(month, day);
    
    // Calculate Nakshatra (based on Moon's position)
    const nakshatra = this.calculateNakshatra(dob);
    
    // Calculate Nakshatra Pada
    const nakshatraPada = this.calculateNakshatraPada(dob);
    
    // Check Manglik
    const manglik = this.isManglik(rashi, dob);
    
    // Calculate planetary positions
    const planets = this.calculatePlanetaryPositions(dob);
    
    // Calculate match points (Guna Milan score)
    const matchPoints = this.calculateGunaMilanScore(rashi, nakshatra);

    return {
      rashi,
      nakshatra,
      nakshatraPada,
      manglik,
      planets,
      matchPoints,
      ascendant: this.calculateAscendant(rashi, dob.getHours()),
      moonSign: rashi,
      sunSign: this.calculateSunSign(month, day),
      chartData: {
        calculatedAt: new Date(),
        source: 'mock_calculation'
      }
    };
  }

  /**
   * Calculate Rashi (Zodiac Sign)
   */
  calculateRashi(month, day) {
    const zodiac = [
      { name: 'Aries', start: [3, 21], end: [4, 19] },
      { name: 'Taurus', start: [4, 20], end: [5, 20] },
      { name: 'Gemini', start: [5, 21], end: [6, 20] },
      { name: 'Cancer', start: [6, 21], end: [7, 22] },
      { name: 'Leo', start: [7, 23], end: [8, 22] },
      { name: 'Virgo', start: [8, 23], end: [9, 22] },
      { name: 'Libra', start: [9, 23], end: [10, 22] },
      { name: 'Scorpio', start: [10, 23], end: [11, 21] },
      { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
      { name: 'Capricorn', start: [12, 22], end: [1, 19] },
      { name: 'Aquarius', start: [1, 20], end: [2, 18] },
      { name: 'Pisces', start: [2, 19], end: [3, 20] }
    ];

    for (const sign of zodiac) {
      const [startMonth, startDay] = sign.start;
      const [endMonth, endDay] = sign.end;
      
      if ((month === startMonth && day >= startDay) ||
          (month === endMonth && day <= endDay) ||
          (startMonth > endMonth && (month > startMonth || month < endMonth))) {
        return sign.name;
      }
    }
    
    return 'Aries'; // Default
  }

  /**
   * Calculate Nakshatra (based on approximate calculation)
   */
  calculateNakshatra(dob) {
    const nakshatras = [
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
      'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
      'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
      'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
      'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    // Simple calculation based on day of year
    const dayOfYear = Math.floor((dob - new Date(dob.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % nakshatras.length;
    return nakshatras[index];
  }

  /**
   * Calculate Nakshatra Pada
   */
  calculateNakshatraPada(dob) {
    // Each nakshatra has 4 padas
    const hour = dob.getHours();
    return (hour % 4) + 1;
  }

  /**
   * Check if person is Manglik
   */
  isManglik(rashi, dob) {
    // Manglik if Mars is in 1st, 4th, 7th, 8th, or 12th house
    // Simplified: Check based on Rashi
    const manglikRashis = ['Aries', 'Scorpio', 'Capricorn'];
    
    // Also check based on birth time
    const hour = dob.getHours();
    const isManglikByTime = hour >= 0 && hour < 4;
    
    return manglikRashis.includes(rashi) || isManglikByTime;
  }

  /**
   * Calculate planetary positions (simplified)
   */
  calculatePlanetaryPositions(dob) {
    const planets = {
      sun: this.calculateRashi(dob.getMonth() + 1, dob.getDate()),
      moon: this.calculateRashi((dob.getMonth() + 3) % 12 + 1, dob.getDate()),
      mars: this.calculateRashi((dob.getMonth() + 1) % 12 + 1, dob.getDate()),
      mercury: this.calculateRashi((dob.getMonth() + 2) % 12 + 1, dob.getDate()),
      jupiter: this.calculateRashi((dob.getMonth() + 9) % 12 + 1, dob.getDate()),
      venus: this.calculateRashi((dob.getMonth() + 7) % 12 + 1, dob.getDate()),
      saturn: this.calculateRashi((dob.getMonth() + 10) % 12 + 1, dob.getDate()),
      rahu: this.calculateRashi((dob.getMonth() + 5) % 12 + 1, dob.getDate()),
      ketu: this.calculateRashi((dob.getMonth() + 11) % 12 + 1, dob.getDate())
    };

    return planets;
  }

  /**
   * Calculate Guna Milan score (out of 36)
   */
  calculateGunaMilanScore(rashi, nakshatra) {
    // Simplified guna milan calculation
    let score = 18; // Base score
    
    // Add points based on rashi compatibility
    const rashiScores = {
      'Aries': 6, 'Taurus': 7, 'Gemini': 6, 'Cancer': 8,
      'Leo': 7, 'Virgo': 6, 'Libra': 7, 'Scorpio': 8,
      'Sagittarius': 6, 'Capricorn': 7, 'Aquarius': 6, 'Pisces': 8
    };
    
    score += rashiScores[rashi] || 6;
    
    // Adjust based on nakshatra
    const favorableNakshatras = ['Rohini', 'Mrigashira', 'Chitra', 'Swati', 'Shravana'];
    if (favorableNakshatras.includes(nakshatra)) {
      score += 4;
    }
    
    return Math.min(score, 36);
  }

  /**
   * Calculate Ascendant (Lagna)
   */
  calculateAscendant(rashi, hour) {
    const ascendants = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    const rashiIndex = ascendants.indexOf(rashi);
    const ascendantIndex = (rashiIndex + Math.floor(hour / 2)) % 12;
    
    return ascendants[ascendantIndex];
  }

  /**
   * Calculate Sun Sign
   */
  calculateSunSign(month, day) {
    return this.calculateRashi(month, day);
  }

  /**
   * Check Manglik status from planetary positions
   */
  checkManglik(planetaryData) {
    // Simplified: Check if Mars is in certain houses
    if (!planetaryData.mars) return false;
    
    const marsHouse = planetaryData.mars.house;
    const manglikHouses = [1, 4, 7, 8, 12];
    
    return manglikHouses.includes(marsHouse);
  }

  /**
   * Extract planet details from API response
   */
  extractPlanetDetails(planetaryData) {
    const planets = {};
    
    const planetNames = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
    
    planetNames.forEach(planet => {
      if (planetaryData[planet]) {
        planets[planet] = {
          sign: planetaryData[planet].sign,
          house: planetaryData[planet].house,
          degree: planetaryData[planet].degree
        };
      }
    });
    
    return planets;
  }

  /**
   * Calculate match score between two horoscopes
   */
  calculateMatchScore(horoscope1, horoscope2) {
    let totalScore = 0;
    const maxScore = 36;
    
    // 1. Rashi compatibility (12 points)
    totalScore += this.calculateRashiCompatibility(horoscope1.rashi, horoscope2.rashi);
    
    // 2. Nakshatra compatibility (8 points)
    totalScore += this.calculateNakshatraCompatibility(horoscope1.nakshatra, horoscope2.nakshatra);
    
    // 3. Manglik compatibility (8 points)
    totalScore += this.calculateManglikCompatibility(horoscope1.manglik, horoscope2.manglik);
    
    // 4. Gana compatibility (6 points)
    totalScore += this.calculateGanaCompatibility(horoscope1.nakshatra, horoscope2.nakshatra);
    
    // 5. Bhakoot compatibility (2 points)
    totalScore += this.calculateBhakootCompatibility(horoscope1.rashi, horoscope2.rashi);
    
    return Math.min(totalScore, maxScore);
  }

  /**
   * Calculate Rashi compatibility score
   */
  calculateRashiCompatibility(rashi1, rashi2) {
    const compatibilityMatrix = {
      'Aries': { good: ['Leo', 'Sagittarius', 'Gemini'], average: ['Aries', 'Aquarius'], poor: ['Cancer', 'Capricorn'] },
      'Taurus': { good: ['Virgo', 'Capricorn', 'Cancer'], average: ['Taurus', 'Pisces'], poor: ['Leo', 'Aquarius'] },
      'Gemini': { good: ['Libra', 'Aquarius', 'Aries'], average: ['Gemini', 'Leo'], poor: ['Virgo', 'Pisces'] },
      'Cancer': { good: ['Scorpio', 'Pisces', 'Taurus'], average: ['Cancer', 'Virgo'], poor: ['Aries', 'Libra'] },
      'Leo': { good: ['Sagittarius', 'Aries', 'Gemini'], average: ['Leo', 'Libra'], poor: ['Taurus', 'Scorpio'] },
      'Virgo': { good: ['Capricorn', 'Taurus', 'Cancer'], average: ['Virgo', 'Scorpio'], poor: ['Gemini', 'Sagittarius'] },
      'Libra': { good: ['Aquarius', 'Gemini', 'Leo'], average: ['Libra', 'Sagittarius'], poor: ['Cancer', 'Capricorn'] },
      'Scorpio': { good: ['Pisces', 'Cancer', 'Virgo'], average: ['Scorpio', 'Capricorn'], poor: ['Leo', 'Aquarius'] },
      'Sagittarius': { good: ['Aries', 'Leo', 'Libra'], average: ['Sagittarius', 'Aquarius'], poor: ['Virgo', 'Pisces'] },
      'Capricorn': { good: ['Taurus', 'Virgo', 'Scorpio'], average: ['Capricorn', 'Pisces'], poor: ['Aries', 'Libra'] },
      'Aquarius': { good: ['Gemini', 'Libra', 'Aries'], average: ['Aquarius', 'Sagittarius'], poor: ['Taurus', 'Scorpio'] },
      'Pisces': { good: ['Cancer', 'Scorpio', 'Taurus'], average: ['Pisces', 'Capricorn'], poor: ['Gemini', 'Sagittarius'] }
    };

    const matrix = compatibilityMatrix[rashi1];
    if (!matrix) return 6;

    if (matrix.good.includes(rashi2)) return 12;
    if (matrix.average.includes(rashi2)) return 8;
    if (matrix.poor.includes(rashi2)) return 4;
    
    return 6; // Default
  }

  /**
   * Calculate Nakshatra compatibility
   */
  calculateNakshatraCompatibility(nakshatra1, nakshatra2) {
    // Simplified compatibility based on nakshatra groups
    const groups = {
      group1: ['Ashwini', 'Magha', 'Mula'],
      group2: ['Bharani', 'Purva Phalguni', 'Purva Ashadha'],
      group3: ['Krittika', 'Uttara Phalguni', 'Uttara Ashadha'],
      // ... add all nakshatras
    };

    // Check if nakshatras are in same group
    for (const group of Object.values(groups)) {
      if (group.includes(nakshatra1) && group.includes(nakshatra2)) {
        return 6; // Same group - average compatibility
      }
    }

    return 8; // Different groups - better compatibility
  }

  /**
   * Calculate Manglik compatibility
   */
  calculateManglikCompatibility(manglik1, manglik2) {
    if (manglik1 && manglik2) return 8; // Both manglik - good
    if (!manglik1 && !manglik2) return 8; // Both non-manglik - good
    return 2; // Mixed - needs remedies
  }

  /**
   * Calculate Gana compatibility
   */
  calculateGanaCompatibility(nakshatra1, nakshatra2) {
    // Simplified gana calculation
    const devaGana = ['Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Swati', 'Anuradha', 'Shravana', 'Revati'];
    const manushyaGana = ['Bharani', 'Rohini', 'Ardra', 'Purva Phalguni', 'Uttara Phalguni', 'Purva Ashadha', 'Uttara Ashadha', 'Purva Bhadrapada'];
    const rakshasaGana = ['Krittika', 'Ashlesha', 'Magha', 'Chitra', 'Vishakha', 'Jyeshtha', 'Mula', 'Dhanishta', 'Shatabhisha'];

    const getGana = (nakshatra) => {
      if (devaGana.includes(nakshatra)) return 'deva';
      if (manushyaGana.includes(nakshatra)) return 'manushya';
      if (rakshasaGana.includes(nakshatra)) return 'rakshasa';
      return 'manushya';
    };

    const gana1 = getGana(nakshatra1);
    const gana2 = getGana(nakshatra2);

    // Deva with Deva or Manushya: Good (6)
    // Manushya with Manushya or Rakshasa: Average (3)
    // Rakshasa with Rakshasa: Good (6)
    // Deva with Rakshasa: Poor (0)
    if (gana1 === 'deva' && gana2 === 'rakshasa') return 0;
    if (gana1 === 'rakshasa' && gana2 === 'deva') return 0;
    
    if ((gana1 === 'deva' && gana2 === 'deva') || 
        (gana1 === 'rakshasa' && gana2 === 'rakshasa')) return 6;
    
    return 3;
  }

  /**
   * Calculate Bhakoot compatibility
   */
  calculateBhakootCompatibility(rashi1, rashi2) {
    // Simplified bhakoot calculation
    const bhakootCompatible = {
      'Aries': ['Gemini', 'Leo', 'Libra', 'Sagittarius', 'Aquarius'],
      'Taurus': ['Cancer', 'Virgo', 'Scorpio', 'Capricorn', 'Pisces'],
      // ... add all rashis
    };

    return bhakootCompatible[rashi1]?.includes(rashi2) ? 2 : 0;
  }

  /**
   * Get compatibility analysis
   */
  getCompatibilityAnalysis(horoscope1, horoscope2, matchScore) {
    const factors = [];
    
    // Rashi analysis
    const rashiScore = this.calculateRashiCompatibility(horoscope1.rashi, horoscope2.rashi);
    factors.push({
      factor: 'Rashi (Moon Sign) Compatibility',
      score: Math.round((rashiScore / 12) * 100),
      description: `${horoscope1.rashi} and ${horoscope2.rashi} ${rashiScore >= 8 ? 'are compatible' : 'need consideration'}`,
      status: rashiScore >= 8 ? 'good' : rashiScore >= 6 ? 'average' : 'poor'
    });

    // Nakshatra analysis
    const nakshatraScore = this.calculateNakshatraCompatibility(horoscope1.nakshatra, horoscope2.nakshatra);
    factors.push({
      factor: 'Nakshatra Compatibility',
      score: Math.round((nakshatraScore / 8) * 100),
      description: `${horoscope1.nakshatra} and ${horoscope2.nakshatra} create ${nakshatraScore >= 6 ? 'harmonious' : 'challenging'} energy`,
      status: nakshatraScore >= 6 ? 'good' : 'average'
    });

    // Manglik analysis
    const manglikScore = this.calculateManglikCompatibility(horoscope1.manglik, horoscope2.manglik);
    factors.push({
      factor: 'Manglik Compatibility',
      score: Math.round((manglikScore / 8) * 100),
      description: manglikScore >= 8 ? 
        'Manglik status matches perfectly' :
        'Manglik mismatch - remedies may be required',
      status: manglikScore >= 8 ? 'good' : 'poor',
      remedies: manglikScore < 8 ? ['Perform specific poojas', 'Wear gemstones', 'Consult astrologer'] : null
    });

    // Gana analysis
    const ganaScore = this.calculateGanaCompatibility(horoscope1.nakshatra, horoscope2.nakshatra);
    factors.push({
      factor: 'Gana (Temperament) Match',
      score: Math.round((ganaScore / 6) * 100),
      description: ganaScore >= 3 ? 'Temperaments are compatible' : 'Temperament mismatch may cause issues',
      status: ganaScore >= 3 ? 'good' : 'poor'
    });

    // Overall assessment
    const overallScore = Math.round((matchScore / 36) * 100);
    let assessment, recommendation;

    if (overallScore >= 75) {
      assessment = 'Excellent Match';
      recommendation = 'Highly compatible. Recommended for marriage with standard rituals.';
    } else if (overallScore >= 60) {
      assessment = 'Good Match';
      recommendation = 'Good compatibility with minor considerations. Some remedies may enhance harmony.';
    } else if (overallScore >= 45) {
      assessment = 'Average Match';
      recommendation = 'Average compatibility. Consultation with astrologer recommended for detailed analysis and remedies.';
    } else {
      assessment = 'Poor Match';
      recommendation = 'Low compatibility. Significant differences exist. Strong remedies or reconsideration advised.';
    }

    return {
      factors,
      overallScore,
      assessment,
      recommendation,
      matchScore,
      maximumScore: 36
    };
  }
}

module.exports = new HoroscopeCalculator();
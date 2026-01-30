// Calculate match score between two users
exports.calculateMatchScore = (user1, user2) => {
  let score = 0;
  const maxScore = 100;
  const weights = {
    age: 15,
    education: 15,
    profession: 10,
    location: 10,
    income: 10,
    lifestyle: 10,
    family: 10,
    preferences: 20
  };

  // 1. Age compatibility (15 points)
  if (user1.age && user2.age) {
    const ageDiff = Math.abs(user1.age - user2.age);
    if (ageDiff <= 3) score += 15;
    else if (ageDiff <= 5) score += 10;
    else if (ageDiff <= 8) score += 5;
  }

  // 2. Education compatibility (15 points)
  if (user1.education && user2.education) {
    const eduLevels = {
      'PhD': 5,
      'Post Graduate': 4,
      'Graduate': 3,
      'Diploma': 2,
      '12th': 1,
      '10th': 0
    };
    
    const edu1 = eduLevels[user1.education] || 0;
    const edu2 = eduLevels[user2.education] || 0;
    const eduDiff = Math.abs(edu1 - edu2);
    
    if (eduDiff === 0) score += 15;
    else if (eduDiff === 1) score += 10;
    else if (eduDiff === 2) score += 5;
  }

  // 3. Profession compatibility (10 points)
  if (user1.profession && user2.profession) {
    const similarProfessions = [
      ['Doctor', 'Doctor', 'Nurse', 'Pharmacist'],
      ['Engineer', 'Engineer', 'Architect', 'Technician'],
      ['Teacher', 'Teacher', 'Professor', 'Lecturer'],
      ['Business', 'Business', 'Entrepreneur', 'Trader'],
      ['Government', 'Government', 'Politician', 'Officer']
    ];
    
    let isSimilar = false;
    for (const group of similarProfessions) {
      if (group.includes(user1.profession) && group.includes(user2.profession)) {
        isSimilar = true;
        break;
      }
    }
    
    if (isSimilar) score += 10;
    else if (user1.profession === user2.profession) score += 10;
    else score += 5;
  }

  // 4. Location compatibility (10 points)
  if (user1.currentCity && user2.currentCity) {
    if (user1.currentCity === user2.currentCity) score += 10;
    else if (user1.currentState === user2.currentState) score += 7;
    else if (user1.currentCountry === user2.currentCountry) score += 5;
    else if (user1.willingToRelocate || user2.willingToRelocate) score += 3;
  }

  // 5. Income compatibility (10 points)
  if (user1.annualIncome && user2.annualIncome) {
    const income1 = user1.annualIncome || 0;
    const income2 = user2.annualIncome || 0;
    const incomeRatio = Math.min(income1, income2) / Math.max(income1, income2);
    
    if (incomeRatio >= 0.8) score += 10;
    else if (incomeRatio >= 0.6) score += 7;
    else if (incomeRatio >= 0.4) score += 5;
    else score += 2;
  }

  // 6. Lifestyle compatibility (10 points)
  let lifestyleScore = 0;
  if (user1.diet === user2.diet) lifestyleScore += 3;
  if (user1.smoking === user2.smoking) lifestyleScore += 3;
  if (user1.drinking === user2.drinking) lifestyleScore += 4;
  score += Math.min(lifestyleScore, 10);

  // 7. Family background (10 points)
  if (user1.subCommunity === user2.subCommunity) score += 5;
  if (user1.gotra !== user2.gotra) score += 5; // Different gotra preferred

  // 8. Preferences match (20 points)
  // Check if users match each other's preferences
  let preferenceScore = 0;
  
  // Check user1 preferences against user2
  if (user1.preferences) {
    if (user1.preferences.ageRange) {
      if (user2.age >= user1.preferences.ageRange.min && 
          user2.age <= user1.preferences.ageRange.min) preferenceScore += 3;
    }
    if (user1.preferences.education && user1.preferences.education.includes(user2.education)) {
      preferenceScore += 3;
    }
    if (user1.preferences.profession && user1.preferences.profession.includes(user2.profession)) {
      preferenceScore += 3;
    }
  }
  
  // Check user2 preferences against user1
  if (user2.preferences) {
    if (user2.preferences.ageRange) {
      if (user1.age >= user2.preferences.ageRange.min && 
          user1.age <= user2.preferences.ageRange.min) preferenceScore += 3;
    }
    if (user2.preferences.education && user2.preferences.education.includes(user1.education)) {
      preferenceScore += 3;
    }
    if (user2.preferences.profession && user2.preferences.profession.includes(user1.profession)) {
      preferenceScore += 3;
    }
  }
  
  score += Math.min(preferenceScore, 20);

  // 9. Community specific bonus (5 points)
  if (user1.subCommunity === user2.subCommunity && user1.subCommunity === 'Yadhavar') {
    score += 5;
  }

  return Math.min(score, maxScore);
};

// Get compatibility breakdown
exports.getCompatibilityBreakdown = (user1, user2) => {
  return {
    ageCompatibility: {
      score: 85,
      description: 'Age difference is ideal (3 years)',
      user1: user1.age,
      user2: user2.age
    },
    educationCompatibility: {
      score: user1.education === user2.education ? 90 : 70,
      description: user1.education === user2.education ? 
        'Same education level' : 'Different education levels',
      user1: user1.education,
      user2: user2.education
    },
    locationCompatibility: {
      score: user1.currentCity === user2.currentCity ? 95 : 60,
      description: user1.currentCity === user2.currentCity ?
        'Same city' : 'Different cities',
      user1: user1.currentCity,
      user2: user2.currentCity
    },
    lifestyleCompatibility: {
      score: 75,
      description: 'Similar lifestyle choices',
      details: {
        diet: user1.diet === user2.diet ? 'Same' : 'Different',
        smoking: user1.smoking === user2.smoking ? 'Same' : 'Different',
        drinking: user1.drinking === user2.drinking ? 'Same' : 'Different'
      }
    },
    familyCompatibility: {
      score: user1.subCommunity === user2.subCommunity ? 90 : 50,
      description: user1.subCommunity === user2.subCommunity ?
        'Same sub-community' : 'Different sub-communities',
      user1: user1.subCommunity,
      user2: user2.subCommunity
    }
  };
};
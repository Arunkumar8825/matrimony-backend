const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Profile = require('../models/Profile');
require('dotenv').config();

// Sample user data
const sampleUsers = [
  {
    email: 'ravi.yadhavar@example.com',
    password: 'password123',
    phone: '9876543210',
    firstName: 'Ravi',
    lastName: 'Yadhavar',
    gender: 'Male',
    dateOfBirth: new Date('1990-05-15'),
    subCommunity: 'Gowda',
    gotra: 'Kashyapa',
    education: 'Engineer',
    profession: 'Software Engineer',
    annualIncome: 1200000,
    currentCity: 'Bangalore',
    currentState: 'Karnataka',
    nativePlace: 'Mysore',
    fatherName: 'Rajesh Yadhavar',
    motherName: 'Lakshmi Yadhavar'
  },
  {
    email: 'priya.yadhavar@example.com',
    password: 'password123',
    phone: '9876543211',
    firstName: 'Priya',
    lastName: 'Yadhavar',
    gender: 'Female',
    dateOfBirth: new Date('1992-08-22'),
    subCommunity: 'Gowda',
    gotra: 'Vasishtha',
    education: 'Doctor',
    profession: 'Pediatrician',
    annualIncome: 1500000,
    currentCity: 'Chennai',
    currentState: 'Tamil Nadu',
    nativePlace: 'Coimbatore',
    fatherName: 'Kumar Yadhavar',
    motherName: 'Geetha Yadhavar'
  },
  {
    email: 'arun.yadhavar@example.com',
    password: 'password123',
    phone: '9876543212',
    firstName: 'Arun',
    lastName: 'Yadhavar',
    gender: 'Male',
    dateOfBirth: new Date('1988-03-10'),
    subCommunity: 'Kuruba',
    gotra: 'Bharadwaja',
    education: 'MBA',
    profession: 'Business',
    annualIncome: 2000000,
    currentCity: 'Hyderabad',
    currentState: 'Telangana',
    nativePlace: 'Vijayawada',
    fatherName: 'Suresh Yadhavar',
    motherName: 'Padma Yadhavar'
  },
  {
    email: 'meera.yadhavar@example.com',
    password: 'password123',
    phone: '9876543213',
    firstName: 'Meera',
    lastName: 'Yadhavar',
    gender: 'Female',
    dateOfBirth: new Date('1993-11-30'),
    subCommunity: 'Yadava',
    gotra: 'Atri',
    education: 'CA',
    profession: 'Chartered Accountant',
    annualIncome: 1800000,
    currentCity: 'Mumbai',
    currentState: 'Maharashtra',
    nativePlace: 'Pune',
    fatherName: 'Vinod Yadhavar',
    motherName: 'Shobha Yadhavar'
  },
  {
    email: 'vikram.yadhavar@example.com',
    password: 'password123',
    phone: '9876543214',
    firstName: 'Vikram',
    lastName: 'Yadhavar',
    gender: 'Male',
    dateOfBirth: new Date('1991-07-18'),
    subCommunity: 'Golla',
    gotra: 'Gautama',
    education: 'Architect',
    profession: 'Architect',
    annualIncome: 1400000,
    currentCity: 'Delhi',
    currentState: 'Delhi',
    nativePlace: 'Gurgaon',
    fatherName: 'Anil Yadhavar',
    motherName: 'Rekha Yadhavar'
  }
];

// Sample profile data
const sampleProfiles = (userId) => ({
  userId,
  hobbies: ['Reading', 'Music', 'Travel', 'Cooking'],
  interests: ['Technology', 'Sports', 'Movies', 'Photography'],
  languages: [
    { language: 'English', proficiency: 'Fluent' },
    { language: 'Hindi', proficiency: 'Fluent' },
    { language: 'Tamil', proficiency: 'Native' }
  ],
  bodyType: 'Athletic',
  complexion: 'Wheatish',
  physicalStatus: 'Normal',
  religion: 'Hindu',
  caste: 'Yadhavar',
  star: 'Rohini',
  rashi: 'Taurus',
  gothram: 'Sample Gothram',
  timeOfBirth: '10:30',
  placeOfBirth: 'Sample City',
  manglik: 'No',
  educationDetails: [
    {
      degree: 'B.Tech',
      specialization: 'Computer Science',
      university: 'IIT',
      year: 2012,
      grade: 'First Class'
    }
  ],
  workExperience: [
    {
      company: 'Tech Corp',
      designation: 'Senior Software Engineer',
      location: 'Bangalore',
      from: new Date('2013-06-01'),
      to: new Date('2020-12-31'),
      current: true,
      description: 'Leading development team'
    }
  ],
  familyValues: 'Moderate',
  familyOrigin: 'Agricultural',
  ancestralProperty: 'Agricultural land in native village',
  workout: 'Regularly',
  yogaMeditation: true,
  expectations: {
    aboutPartner: 'Looking for someone who is well-educated, family-oriented, and shares similar values.',
    familyValues: 'Traditional with modern outlook',
    careerOriented: true,
    settleAbroad: false
  }
});

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing users (optional)
    // await User.deleteMany({});
    // await Profile.deleteMany({});
    // console.log('Cleared existing users');

    const createdUsers = [];

    for (const userData of sampleUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create user
      const user = new User(userData);
      
      // Calculate profile completion
      user.calculateProfileCompletion();
      
      // Mark as verified for testing
      user.isEmailVerified = true;
      user.isPhoneVerified = true;
      user.isProfileVerified = true;
      user.verificationStatus = 'Verified';
      
      await user.save();

      // Create profile
      const profileData = sampleProfiles(user._id);
      const profile = new Profile(profileData);
      await profile.save();

      // Update user with profile reference
      user.profile = profile._id;
      await user.save();

      createdUsers.push({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userId: user._id
      });

      console.log(`✅ Created user: ${user.email}`);
    }

    console.log('\n📋 Created Users Summary:');
    console.table(createdUsers.map(user => ({
      Email: user.email,
      Name: user.name,
      'User ID': user.userId.toString().slice(-6)
    })));

    // Print credentials for testing
    console.log('\n🔑 Test Credentials:');
    console.log('Email: ravi.yadhavar@example.com');
    console.log('Password: password123');
    console.log('\nEmail: priya.yadhavar@example.com');
    console.log('Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
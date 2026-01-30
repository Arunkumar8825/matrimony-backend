const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const adminData = {
  email: process.env.ADMIN_EMAIL || 'admin@yadhavarmatrimony.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  name: 'Super Admin',
  role: 'superadmin',
  permissions: [
    {
      module: 'users',
      actions: ['read', 'create', 'update', 'delete', 'verify']
    },
    {
      module: 'payments',
      actions: ['read', 'refund', 'update']
    },
    {
      module: 'reports',
      actions: ['read', 'export']
    },
    {
      module: 'settings',
      actions: ['read', 'update']
    },
    {
      module: 'admins',
      actions: ['read', 'create', 'update', 'delete']
    }
  ],
  isActive: true
};

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin already exists. Updating...');
      
      // Update existing admin
      existingAdmin.name = adminData.name;
      existingAdmin.role = adminData.role;
      existingAdmin.permissions = adminData.permissions;
      existingAdmin.isActive = adminData.isActive;
      
      // Only update password if it's different from default
      if (adminData.password !== 'admin123') {
        existingAdmin.password = adminData.password;
      }
      
      await existingAdmin.save();
      console.log('✅ Admin updated successfully');
    } else {
      // Create new admin
      const admin = new Admin(adminData);
      await admin.save();
      console.log('✅ Admin created successfully');
    }

    // List all admins
    const admins = await Admin.find({}, 'email name role isActive');
    console.log('\n📋 List of Admins:');
    console.table(admins.map(admin => ({
      Email: admin.email,
      Name: admin.name,
      Role: admin.role,
      Active: admin.isActive ? '✅' : '❌'
    })));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const appConfig = require('./src/config/app.config');
const User = require('./src/models/user.model');
const { hashPassword } = require('./src/utils/hash');

async function createSuperAdmin() {
  try {
    console.log('\n🚀 Creating SuperAdmin Account...\n');
    
    // Connect to MongoDB
    console.log(`📦 Connecting to MongoDB...`);
    await mongoose.connect(appConfig.db.uri, {
      dbName: 'healthcare',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Define superadmin credentials
    const superadminEmail = 'superadmin@healthcare.com';
    const superadminPassword = 'SuperAdmin@123456';

    console.log('📧 Email: ' + superadminEmail);
    console.log('🔐 Password: ' + superadminPassword + '\n');

    // Check if superadmin already exists
    const existingAdmin = await User.findOne({ email: superadminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  SuperAdmin already exists. Updating...\n');
      
      const hashedPassword = await hashPassword(superadminPassword);
      const updated = await User.findByIdAndUpdate(
        existingAdmin._id,
        {
          password: hashedPassword,
          loginAttempts: 0,
          lockUntil: null,
          status: 'ACTIVE',
          isEmailVerified: true,
          isActive: true
        },
        { new: true }
      );
      
      console.log('✅ SuperAdmin updated successfully!\n');
      console.log('Login Credentials:');
      console.log('  📧 Email: ' + updated.email);
      console.log('  🔐 Password: ' + superadminPassword);
    } else {
      console.log('📝 Creating new SuperAdmin account...\n');
      
      const hashedPassword = await hashPassword(superadminPassword);
      
      const newSuperAdmin = new User({
        email: superadminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        isEmailVerified: true,
        isActive: true,
        loginAttempts: 0,
        personalInfo: {
          firstName: 'Super',
          lastName: 'Admin',
          gender: 'OTHER',
          dateOfBirth: new Date('1990-01-01')
        }
      });
      
      await newSuperAdmin.save();
      
      console.log('✅ SuperAdmin created successfully!\n');
      console.log('Login Credentials:');
      console.log('  📧 Email: ' + newSuperAdmin.email);
      console.log('  🔐 Password: ' + superadminPassword);
      console.log('  👤 Role: ' + newSuperAdmin.role);
      console.log('  📊 Status: ' + newSuperAdmin.status);
    }

    console.log('\n✅ Done!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin();

const mongoose = require('mongoose');
const { initializeConfig, appConfig } = require('./src/config');
const User = require('./src/models/user.model');
const { hashPassword } = require('./src/utils/hash');

(async () => {
  try {
    await initializeConfig();
    
    const superadminEmail = 'superadmin@healthcare.vn'; // Use app's expected email
    const newPassword = 'SuperAdmin@123456';
    
    console.log(`🔄 Resetting password for: ${superadminEmail}`);
    
    // Hash password
    const hashedPassword = await hashPassword(newPassword);
    
    // Find and update superadmin
    const result = await User.findOneAndUpdate(
      { email: superadminEmail },
      { 
        password: hashedPassword,
        loginAttempts: 0,
        lockUntil: null,
        status: 'ACTIVE'
      },
      { new: true }
    );
    
    if (!result) {
      console.log('❌ Superadmin not found, creating new one...');
      
      const newSuperAdmin = new User({
        email: superadminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        isEmailVerified: true,
        loginAttempts: 0,
        personalInfo: {
          firstName: 'Admin',
          lastName: 'System',
          gender: 'OTHER',
          dateOfBirth: new Date('1990-01-01')
        }
      });
      
      await newSuperAdmin.save();
      console.log('✅ Superadmin created successfully');
    } else {
      console.log('✅ Superadmin password reset successfully');
    }
    
    console.log(`📧 Email: ${superadminEmail}`);
    console.log(`🔐 Password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

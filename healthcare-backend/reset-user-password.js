const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./src/models/user.model');
    
    const email = 'phatto@gmail.com';
    const newPassword = 'Phat12345@'; // Giữ nguyên mật khẩu cũ của Web
    
    // Hash với SALT_ROUNDS = 12 (giống Web backend)
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await User.updateOne(
      { email: email },
      { 
        $set: { 
          password: hashedPassword, 
          loginAttempts: 0, 
          lockUntil: null 
        } 
      }
    );
    
    console.log('Reset result:', result);
    
    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successfully!');
      console.log('Email:', email);
      console.log('Password: Phat12345@');
    } else {
      console.log('❌ User not found or password not changed');
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetPassword();

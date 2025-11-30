/**
 * 🔍 SCRIPT KIỂM TRA PATIENT PROFILES "MỒ CÔI"
 * 
 * Script này sẽ:
 * 1. Tìm Patient profiles có userId không tồn tại hoặc user không còn role PATIENT
 * 2. Hiển thị chi tiết từng trường hợp
 * 3. Tùy chọn xóa các profiles mồ côi
 * 
 * Chạy: node src/scripts/check-orphan-patients.js
 */

const mongoose = require('mongoose');
const { initializeConfig } = require('../config');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const { ROLES } = require('../constants/roles');

async function checkOrphanPatients() {
  try {
    console.log('🔍 Kiểm tra Patient Profiles mồ côi...\n');
    
    await initializeConfig();
    
    // 1. Lấy tất cả Patient profiles
    const allPatients = await Patient.find({ isDeleted: { $ne: true } })
      .select('_id patientId userId createdAt');
    
    console.log(`📋 Tổng Patient Profiles: ${allPatients.length}\n`);
    
    const orphanPatients = [];
    const wrongRolePatients = [];
    const validPatients = [];
    
    for (const patient of allPatients) {
      // Kiểm tra User tồn tại
      const user = await User.findById(patient.userId)
        .select('_id email role status isDeleted');
      
      if (!user) {
        orphanPatients.push({
          patientId: patient.patientId,
          reason: 'User không tồn tại',
          userId: patient.userId
        });
      } else if (user.isDeleted) {
        orphanPatients.push({
          patientId: patient.patientId,
          reason: 'User đã bị xóa',
          email: user.email,
          userId: patient.userId
        });
      } else if (user.role !== ROLES.PATIENT) {
        wrongRolePatients.push({
          patientId: patient.patientId,
          email: user.email,
          currentRole: user.role,
          userId: patient.userId
        });
      } else {
        validPatients.push({
          patientId: patient.patientId,
          email: user.email
        });
      }
    }
    
    // 2. Hiển thị kết quả
    console.log('=' .repeat(60));
    console.log('📊 KẾT QUẢ KIỂM TRA:');
    console.log('=' .repeat(60));
    
    console.log(`\n✅ Patient profiles hợp lệ: ${validPatients.length}`);
    
    if (orphanPatients.length > 0) {
      console.log(`\n❌ Patient profiles MỒ CÔI (User không tồn tại/đã xóa): ${orphanPatients.length}`);
      orphanPatients.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.patientId} - ${p.reason} ${p.email ? `(${p.email})` : ''}`);
      });
    }
    
    if (wrongRolePatients.length > 0) {
      console.log(`\n⚠️  Patient profiles có User KHÔNG còn role PATIENT: ${wrongRolePatients.length}`);
      wrongRolePatients.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.patientId} - ${p.email} (Role hiện tại: ${p.currentRole})`);
      });
    }
    
    // 3. Thống kê users
    console.log('\n' + '=' .repeat(60));
    console.log('📊 THỐNG KÊ USERS THEO ROLE:');
    console.log('=' .repeat(60));
    
    const userStats = await User.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    userStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });
    
    const totalActiveUsers = userStats.reduce((sum, s) => sum + s.count, 0);
    console.log(`   ---------------`);
    console.log(`   TỔNG: ${totalActiveUsers}`);
    
    // 4. Đề xuất hành động
    if (orphanPatients.length > 0 || wrongRolePatients.length > 0) {
      console.log('\n' + '=' .repeat(60));
      console.log('💡 ĐỀ XUẤT:');
      console.log('=' .repeat(60));
      
      if (orphanPatients.length > 0) {
        console.log(`\n🗑️  Có thể xóa ${orphanPatients.length} Patient profiles mồ côi.`);
        console.log('   Chạy script với tham số --clean để xóa:');
        console.log('   node src/scripts/check-orphan-patients.js --clean');
      }
      
      if (wrongRolePatients.length > 0) {
        console.log(`\n⚠️  Có ${wrongRolePatients.length} Patient profiles thuộc về users đã đổi role.`);
        console.log('   Bạn có thể giữ lại (để bảo toàn lịch sử y tế) hoặc xóa nếu cần.');
      }
    }
    
    // 5. Nếu có tham số --clean, xóa các orphan profiles
    if (process.argv.includes('--clean')) {
      console.log('\n🧹 Đang dọn dẹp Patient profiles mồ côi...');
      
      for (const orphan of orphanPatients) {
        await Patient.findOneAndUpdate(
          { patientId: orphan.patientId },
          { isDeleted: true, deletedAt: new Date() }
        );
        console.log(`   ✅ Đã xóa: ${orphan.patientId}`);
      }
      
      console.log(`\n✅ Đã xóa ${orphanPatients.length} Patient profiles mồ côi.`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

checkOrphanPatients();

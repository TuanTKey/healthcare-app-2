/**
 * 🔄 SCRIPT ĐỒNG BỘ PATIENT PROFILES
 * 
 * Script này sẽ:
 * 1. Tìm tất cả User có role = PATIENT
 * 2. Kiểm tra xem user đó đã có Patient profile chưa
 * 3. Nếu chưa có, tạo Patient profile mới
 * 
 * Chạy: node src/scripts/sync-patient-profiles.js
 */

const mongoose = require('mongoose');
const { initializeConfig } = require('../config');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const { ROLES } = require('../constants/roles');

async function syncPatientProfiles() {
  try {
    console.log('🔄 Bắt đầu đồng bộ Patient Profiles...\n');
    
    // Khởi tạo config và kết nối DB
    await initializeConfig();
    
    // 1. Lấy thống kê hiện tại
    const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
    const totalPatientUsers = await User.countDocuments({ 
      role: ROLES.PATIENT, 
      isDeleted: { $ne: true } 
    });
    const totalPatientProfiles = await Patient.countDocuments({ isDeleted: { $ne: true } });
    
    console.log('📊 THỐNG KÊ HIỆN TẠI:');
    console.log(`   - Tổng Users (chưa xóa): ${totalUsers}`);
    console.log(`   - Users có role PATIENT: ${totalPatientUsers}`);
    console.log(`   - Patient Profiles: ${totalPatientProfiles}`);
    console.log(`   - Thiếu: ${totalPatientUsers - totalPatientProfiles} profiles\n`);
    
    // 2. Tìm tất cả user có role = PATIENT nhưng chưa có Patient profile
    const patientUsers = await User.find({ 
      role: ROLES.PATIENT,
      isDeleted: { $ne: true }
    }).select('_id email personalInfo');
    
    console.log(`🔍 Tìm thấy ${patientUsers.length} users có role PATIENT\n`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of patientUsers) {
      try {
        // Kiểm tra xem đã có Patient profile chưa
        const existingPatient = await Patient.findOne({ userId: user._id });
        
        if (existingPatient) {
          console.log(`⏭️  [SKIP] ${user.email} - Đã có Patient profile: ${existingPatient.patientId}`);
          skipped++;
          continue;
        }
        
        // Tạo Patient profile mới
        const patientId = `PAT${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
        
        const newPatient = new Patient({
          userId: user._id,
          patientId: patientId,
          createdBy: user._id, // Self-created
          preferences: {
            preferredLanguage: 'vi',
            communicationMethod: 'EMAIL',
            privacyLevel: 'STANDARD'
          }
        });
        
        await newPatient.save();
        console.log(`✅ [CREATED] ${user.email} - Patient ID: ${patientId}`);
        created++;
        
      } catch (err) {
        console.error(`❌ [ERROR] ${user.email}: ${err.message}`);
        errors++;
      }
    }
    
    // 3. Hiển thị kết quả
    console.log('\n' + '='.repeat(50));
    console.log('📋 KẾT QUẢ ĐỒNG BỘ:');
    console.log(`   ✅ Đã tạo mới: ${created} profiles`);
    console.log(`   ⏭️  Đã bỏ qua: ${skipped} (đã tồn tại)`);
    console.log(`   ❌ Lỗi: ${errors}`);
    console.log('='.repeat(50));
    
    // 4. Thống kê sau khi đồng bộ
    const finalPatientProfiles = await Patient.countDocuments({ isDeleted: { $ne: true } });
    console.log(`\n📊 SAU KHI ĐỒNG BỘ:`);
    console.log(`   - Patient Profiles: ${finalPatientProfiles}`);
    console.log(`   - Users PATIENT: ${totalPatientUsers}`);
    console.log(`   - Khớp: ${finalPatientProfiles === totalPatientUsers ? '✅ YES' : '❌ NO'}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Lỗi chung:', error);
    process.exit(1);
  }
}

// Chạy script
syncPatientProfiles();

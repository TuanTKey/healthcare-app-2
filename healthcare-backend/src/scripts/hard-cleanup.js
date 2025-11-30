// Hard delete các Patient profiles mồ côi
const mongoose = require('mongoose');
const { initializeConfig } = require('../config');
const Patient = require('../models/patient.model');
const User = require('../models/user.model');
const { ROLES } = require('../constants/roles');

async function hardCleanup() {
  await initializeConfig();
  
  console.log('🔍 Tìm Patient profiles mồ côi để xóa vĩnh viễn...\n');
  
  // Lấy tất cả Patient profiles
  const allPatients = await Patient.find({});
  
  console.log(`Tổng Patient profiles trong DB: ${allPatients.length}`);
  
  let deleted = 0;
  
  for (const patient of allPatients) {
    const user = await User.findById(patient.userId);
    
    // Nếu user không tồn tại hoặc user đã bị xóa
    if (!user || user.isDeleted === true) {
      console.log(`🗑️  Xóa: ${patient.patientId} (User không tồn tại)`);
      await Patient.findByIdAndDelete(patient._id);
      deleted++;
    } 
    // Nếu user không còn role PATIENT
    else if (user.role !== ROLES.PATIENT) {
      console.log(`🗑️  Xóa: ${patient.patientId} (User role: ${user.role}, không phải PATIENT)`);
      await Patient.findByIdAndDelete(patient._id);
      deleted++;
    }
  }
  
  console.log(`\n✅ Đã xóa vĩnh viễn ${deleted} Patient profiles mồ côi`);
  
  // Kiểm tra lại
  const finalCount = await Patient.countDocuments({});
  const patientUsers = await User.countDocuments({ 
    role: ROLES.PATIENT,
    isDeleted: { $ne: true }
  });
  
  console.log('\n📊 SAU KHI DỌN DẸP:');
  console.log(`   Patient Profiles: ${finalCount}`);
  console.log(`   Users PATIENT: ${patientUsers}`);
  console.log(`   Khớp: ${finalCount === patientUsers ? '✅ YES' : '❌ NO'}`);
  
  process.exit(0);
}

hardCleanup();

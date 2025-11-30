// Kiểm tra nhanh số lượng thực tế
const mongoose = require('mongoose');
const { initializeConfig } = require('../config');
const Patient = require('../models/patient.model');
const User = require('../models/user.model');
const { ROLES } = require('../constants/roles');

async function quickCheck() {
  await initializeConfig();
  
  // Đếm Patient profiles chưa bị xóa (soft delete)
  const activePatients = await Patient.countDocuments({ 
    $or: [
      { isDeleted: false }, 
      { isDeleted: { $exists: false } }
    ] 
  });
  
  // Đếm Patient profiles đã bị soft delete  
  const deletedPatients = await Patient.countDocuments({ isDeleted: true });
  
  // Đếm Users có role PATIENT
  const patientUsers = await User.countDocuments({ 
    role: ROLES.PATIENT,
    isDeleted: { $ne: true }
  });
  
  // Tổng Users
  const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
  
  console.log('\n📊 THỐNG KÊ CHÍNH XÁC:');
  console.log('='.repeat(40));
  console.log(`Tổng Users (active):      ${totalUsers}`);
  console.log(`Users role PATIENT:       ${patientUsers}`);
  console.log(`Patient Profiles (active): ${activePatients}`);
  console.log(`Patient Profiles (deleted): ${deletedPatients}`);
  console.log('='.repeat(40));
  console.log(`✅ Khớp: ${activePatients === patientUsers ? 'YES ✓' : 'NO ✗'}`);
  
  process.exit(0);
}

quickCheck();

// Kiểm tra thống kê chỉ users ACTIVE
const { initializeConfig } = require('../config');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');

async function check() {
  await initializeConfig();
  
  // Đếm users ACTIVE (không bị xóa)
  const activeUsers = await User.countDocuments({ 
    status: 'ACTIVE', 
    isDeleted: { $ne: true } 
  });
  
  // Đếm users PATIENT + ACTIVE
  const activePatientUsers = await User.countDocuments({ 
    status: 'ACTIVE', 
    role: 'PATIENT',
    isDeleted: { $ne: true } 
  });
  
  // Đếm Patient profiles
  const patientProfiles = await Patient.countDocuments({});
  
  console.log('\n📊 THỐNG KÊ (CHỈ STATUS = ACTIVE):');
  console.log('='.repeat(40));
  console.log(`Total Users ACTIVE:        ${activeUsers}`);
  console.log(`Users PATIENT + ACTIVE:    ${activePatientUsers}`);
  console.log(`Patient Profiles:          ${patientProfiles}`);
  console.log('='.repeat(40));
  
  // Chi tiết theo role
  const byRole = await User.aggregate([
    { $match: { status: 'ACTIVE', isDeleted: { $ne: true } } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('\n📋 CHI TIẾT THEO ROLE (CHỈ ACTIVE):');
  byRole.forEach(r => console.log(`   ${r._id}: ${r.count}`));
  
  process.exit(0);
}

check();

/**
 * 🏥 Script tạo hồ sơ bệnh nhân cho tất cả users có lịch hẹn thành công
 * Chạy: node src/scripts/create-patient-profiles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const Appointment = require('../models/appointment.model');

// Kết nối database
const connectDB = async () => {
  try {
    const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare';
    await mongoose.connect(dbUri);
    console.log('✅ Đã kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

// Tạo mã bệnh nhân duy nhất
const generatePatientId = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Đếm số bệnh nhân trong tháng này
  const count = await Patient.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
      $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
    }
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `BN${year}${month}${sequence}`;
};

// Hàm chính
const createPatientProfiles = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Đang tìm các lịch hẹn thành công...\n');
    
    // Lấy tất cả appointments có status thành công
    const successfulAppointments = await Appointment.find({
      status: { $in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'IN_PROGRESS'] }
    }).populate('patientId', '_id email personalInfo role');
    
    console.log(`📋 Tìm thấy ${successfulAppointments.length} lịch hẹn thành công`);
    
    // Lấy unique patient IDs
    const patientUserIds = [...new Set(
      successfulAppointments
        .filter(apt => apt.patientId)
        .map(apt => apt.patientId._id.toString())
    )];
    
    console.log(`👥 Số bệnh nhân duy nhất: ${patientUserIds.length}\n`);
    
    // Lấy admin/superadmin làm createdBy
    const admin = await User.findOne({ 
      role: { $in: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'] },
      status: 'ACTIVE'
    });
    
    if (!admin) {
      console.log('❌ Không tìm thấy admin để làm createdBy');
      process.exit(1);
    }
    
    console.log(`👤 Sử dụng admin: ${admin.email} làm createdBy\n`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const userId of patientUserIds) {
      try {
        // Kiểm tra xem đã có hồ sơ bệnh nhân chưa
        const existingPatient = await Patient.findOne({ userId });
        
        if (existingPatient) {
          console.log(`⏭️  Đã có hồ sơ: ${existingPatient.patientId}`);
          skipped++;
          continue;
        }
        
        // Lấy thông tin user
        const user = await User.findById(userId);
        if (!user) {
          console.log(`⚠️  Không tìm thấy user: ${userId}`);
          errors++;
          continue;
        }
        
        // Tạo mã bệnh nhân mới
        const patientId = await generatePatientId();
        
        // Tạo hồ sơ bệnh nhân với thông tin cơ bản
        const patientProfile = new Patient({
          userId: user._id,
          patientId: patientId,
          bloodType: 'UNKNOWN',
          
          // Thông tin khẩn cấp từ user nếu có
          emergencyInfo: {
            contactName: user.personalInfo?.emergencyContact?.name || '',
            contactPhone: user.personalInfo?.emergencyContact?.phone || '',
            contactRelationship: user.personalInfo?.emergencyContact?.relationship ? 
              user.personalInfo.emergencyContact.relationship.toUpperCase() : 'OTHER',
            knownAllergies: [],
            currentMedications: []
          },
          
          // Mảng rỗng cho các thông tin y tế
          allergies: [],
          chronicConditions: [],
          currentMedications: [],
          familyHistory: [],
          
          // Lifestyle mặc định
          lifestyle: {
            smoking: { status: 'NEVER' },
            alcohol: { status: 'NEVER' },
            exercise: { frequency: 'SEDENTARY' },
            diet: 'OMNIVORE'
          },
          
          // Trạng thái
          admissionStatus: 'DISCHARGED',
          riskLevel: 'LOW',
          
          // Tùy chọn
          preferences: {
            preferredLanguage: 'vi',
            communicationMethod: 'EMAIL',
            privacyLevel: 'STANDARD',
            allowResearch: false,
            emergencyContactPriority: 'MEDIUM'
          },
          
          createdBy: admin._id
        });
        
        await patientProfile.save();
        
        console.log(`✅ Đã tạo hồ sơ: ${patientId} cho ${user.email}`);
        created++;
        
      } catch (err) {
        console.error(`❌ Lỗi tạo hồ sơ cho user ${userId}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 KẾT QUẢ:');
    console.log(`   ✅ Đã tạo mới: ${created} hồ sơ`);
    console.log(`   ⏭️  Bỏ qua (đã có): ${skipped} hồ sơ`);
    console.log(`   ❌ Lỗi: ${errors}`);
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('❌ Lỗi script:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối MongoDB');
    process.exit(0);
  }
};

// Chạy script
createPatientProfiles();

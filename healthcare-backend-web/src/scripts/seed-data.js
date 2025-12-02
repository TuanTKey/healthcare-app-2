#!/usr/bin/env node

/**
 * 🌱 SCRIPT SEED DỮ LIỆU TEST
 * - Tạo dữ liệu test cho hệ thống healthcare
 * - Sử dụng: node src/scripts/seed-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Patient = require('../models/patient.model');
const Appointment = require('../models/appointment.model');
const Prescription = require('../models/prescription.model');
const Bill = require('../models/bill.model');
const MedicalRecord = require('../models/medicalRecord.model');
const Consultation = require('../models/consultation.model');
const { hashPassword } = require('../utils/hash');
const { ROLES } = require('../constants/roles');

// 📊 Dữ liệu seed
const SEED_DATA = {
  doctors: 5,
  patients: 25,
  appointmentsPerPatient: 2,
  prescriptionsPerPatient: 1,
  billsPerPatient: 1,
  medicalRecordsPerPatient: 1,
  consultationsPerAppointment: 1
};

async function seedDatabase() {
  try {
    console.log('🌱 Bắt đầu seed dữ liệu...\n');

    // 🔌 Kết nối MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Kết nối MongoDB thành công\n');

    // 🗑️ Xóa dữ liệu cũ (tùy chọn)
    const confirmDelete = process.argv[2] === '--reset';
    if (confirmDelete) {
      console.log('🗑️ Xóa dữ liệu cũ...');
      await User.deleteMany({ email: /^(doctor|patient|test)/i });
      await Patient.deleteMany({});
      await Appointment.deleteMany({});
      await Prescription.deleteMany({});
      await Bill.deleteMany({});
      await MedicalRecord.deleteMany({});
      await Consultation.deleteMany({});
      console.log('✅ Dữ liệu cũ đã được xóa\n');
    }

    // 👨‍⚕️ TẠO BÁC SĨ
    console.log(`👨‍⚕️ Tạo ${SEED_DATA.doctors} bác sĩ...`);
    const doctors = [];
    const doctorNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'];
    
    for (let i = 0; i < SEED_DATA.doctors; i++) {
      const passwordHash = await hashPassword('Doctor@2025');
      const doctor = await User.create({
        email: `doctor${i + 1}@healthcare.vn`,
        name: doctorNames[i],
        passwordHash,
        role: ROLES.DOCTOR,
        phone: `090${Math.random().toString().slice(2, 8).padEnd(7, '0')}`,
        address: `Phòng khám ${i + 1}, Bệnh viện Y tế`,
        status: 'ACTIVE',
      });
      doctors.push(doctor);
      console.log(`  ✅ ${doctor.email}`);
    }
    console.log('');

    // 🤝 TẠO BỆNH NHÂN
    console.log(`🤝 Tạo ${SEED_DATA.patients} bệnh nhân...`);
    const patients = [];
    const genders = ['MALE', 'FEMALE', 'OTHER'];
    const bloodTypes = ['A', 'B', 'AB', 'O'];
    
    for (let i = 0; i < SEED_DATA.patients; i++) {
      const passwordHash = await hashPassword('Patient@2025');
      const user = await User.create({
        email: `patient${i + 1}@healthcare.vn`,
        name: `Bệnh nhân ${i + 1}`,
        passwordHash,
        role: ROLES.PATIENT,
        phone: `098${Math.random().toString().slice(2, 8).padEnd(7, '0')}`,
        dateOfBirth: new Date(1990 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: genders[Math.floor(Math.random() * genders.length)],
        address: `${123 + i} Đường ABC, Quận 1, TP.HCM`,
        status: 'ACTIVE',
      });

      // 🏥 TẠO BỆNH ÁN BỆNH NHÂN
      const patientId = `PAT-${user._id.toString().toUpperCase().slice(-8)}-${Date.now() + i}`;
      const patient = await Patient.create({
        userId: user._id,
        patientId,
        bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
        height: 160 + Math.floor(Math.random() * 30),
        weight: 50 + Math.floor(Math.random() * 40),
        allergies: ['Penicillin', 'Aspirin', 'None'][Math.floor(Math.random() * 3)],
        medicalHistory: 'Không có bệnh nền',
      });

      patients.push({ user, patient });
      console.log(`  ✅ ${user.email} (${patientId})`);
    }
    console.log('');

    // 📅 TẠO LỊCH HẸN
    console.log(`📅 Tạo lịch hẹn (${SEED_DATA.patients * SEED_DATA.appointmentsPerPatient} tổng số)...`);
    const appointments = [];
    const statuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
    
    for (const { user: patientUser, patient } of patients) {
      for (let j = 0; j < SEED_DATA.appointmentsPerPatient; j++) {
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 30) - 15);
        appointmentDate.setHours(8 + Math.floor(Math.random() * 8), 0, 0, 0);

        const appointment = await Appointment.create({
          patientId: patientUser._id,
          patientName: patientUser.name,
          doctorId: doctor._id,
          doctorName: doctor.name,
          appointmentDate,
          reason: ['Khám tổng quát', 'Khám chuyên khoa', 'Tái khám', 'Tư vấn'][Math.floor(Math.random() * 4)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          notes: 'Ghi chú từ bác sĩ',
          department: 'Khoa Nội',
        });

        appointments.push(appointment);
      }
    }
    console.log(`  ✅ Tạo thành công ${appointments.length} lịch hẹn\n`);

    // 📋 TẠO HỒ SƠ Y TẾ
    console.log(`📋 Tạo hồ sơ y tế (${SEED_DATA.patients * SEED_DATA.medicalRecordsPerPatient} tổng số)...`);
    for (const { user: patientUser, patient } of patients) {
      for (let j = 0; j < SEED_DATA.medicalRecordsPerPatient; j++) {
        await MedicalRecord.create({
          patientId: patientUser._id,
          recordDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          diagnosis: 'Chẩn đoán bệnh',
          symptoms: 'Các triệu chứng',
          treatment: 'Phương pháp điều trị',
          doctorNotes: 'Ghi chú từ bác sĩ',
          followUpDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        });
      }
    }
    console.log(`  ✅ Tạo thành công ${SEED_DATA.patients * SEED_DATA.medicalRecordsPerPatient} hồ sơ y tế\n`);

    // 💊 TẠO ĐƠN THUỐC
    console.log(`💊 Tạo đơn thuốc (${SEED_DATA.patients * SEED_DATA.prescriptionsPerPatient} tổng số)...`);
    for (const { user: patientUser, patient } of patients) {
      for (let j = 0; j < SEED_DATA.prescriptionsPerPatient; j++) {
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];
        await Prescription.create({
          patientId: patientUser._id,
          doctorId: doctor._id,
          prescriptionDate: new Date(),
          medications: [
            { name: 'Paracetamol', dosage: '500mg', frequency: '3 lần/ngày', duration: '5 ngày' },
            { name: 'Amoxicillin', dosage: '250mg', frequency: '2 lần/ngày', duration: '7 ngày' },
          ],
          notes: 'Hướng dẫn sử dụng thuốc',
          isActive: true,
        });
      }
    }
    console.log(`  ✅ Tạo thành công ${SEED_DATA.patients * SEED_DATA.prescriptionsPerPatient} đơn thuốc\n`);

    // 💳 TẠO HÓA ĐƠN
    console.log(`💳 Tạo hóa đơn (${SEED_DATA.patients * SEED_DATA.billsPerPatient} tổng số)...`);
    for (const { user: patientUser, patient } of patients) {
      for (let j = 0; j < SEED_DATA.billsPerPatient; j++) {
        await Bill.create({
          patientId: patientUser._id,
          billNumber: `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          billDate: new Date(),
          services: [
            { description: 'Khám tổng quát', amount: 500000 },
            { description: 'Xét nghiệm máu', amount: 300000 },
            { description: 'Chụp X-ray', amount: 400000 },
          ],
          totalAmount: 1200000,
          paidAmount: 1200000,
          status: ['PAID', 'PENDING', 'OVERDUE'][Math.floor(Math.random() * 3)],
          paymentMethod: ['CASH', 'CARD', 'TRANSFER'][Math.floor(Math.random() * 3)],
        });
      }
    }
    console.log(`  ✅ Tạo thành công ${SEED_DATA.patients * SEED_DATA.billsPerPatient} hóa đơn\n`);

    // 🤝 TẠO LƯỢT KHÁM
    console.log(`🤝 Tạo lượt khám (tương ứng với lịch hẹn)...`);
    for (const appointment of appointments) {
      if (appointment.status === 'COMPLETED') {
        await Consultation.create({
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentId: appointment._id,
          consultationDate: appointment.appointmentDate,
          chiefComplaint: 'Tâm sự ban đầu',
          vitals: {
            temperature: 36.5,
            bloodPressure: '120/80',
            heartRate: 75,
            respiratoryRate: 16,
          },
          assessment: 'Đánh giá bác sĩ',
          plan: 'Kế hoạch điều trị',
          duration: 30,
        });
      }
    }
    console.log(`  ✅ Tạo lượt khám thành công\n`);

    // 📊 TÓMON TÍNH
    console.log('═════════════════════════════════════════');
    console.log('📊 THỐNG KÊ DỮ LIỆU SEED');
    console.log('═════════════════════════════════════════');
    console.log(`👨‍⚕️  Bác sĩ: ${doctors.length}`);
    console.log(`🤝 Bệnh nhân: ${patients.length}`);
    console.log(`📅 Lịch hẹn: ${appointments.length}`);
    console.log(`📋 Hồ sơ y tế: ${SEED_DATA.patients * SEED_DATA.medicalRecordsPerPatient}`);
    console.log(`💊 Đơn thuốc: ${SEED_DATA.patients * SEED_DATA.prescriptionsPerPatient}`);
    console.log(`💳 Hóa đơn: ${SEED_DATA.patients * SEED_DATA.billsPerPatient}`);
    console.log('═════════════════════════════════════════\n');

    // 🧪 TEST DỮ LIỆU
    console.log('🧪 TEST DỮ LIỆU ĐỒNG BỘ:');
    console.log('─────────────────────────────────────────');
    
    // Kiểm tra bệnh nhân
    const patientCount = await Patient.countDocuments();
    console.log(`✅ Số bệnh nhân trong DB: ${patientCount}`);

    // Kiểm tra lịch hẹn
    const appointmentCount = await Appointment.countDocuments();
    console.log(`✅ Số lịch hẹn trong DB: ${appointmentCount}`);

    // Kiểm tra hóa đơn
    const billCount = await Bill.countDocuments();
    console.log(`✅ Số hóa đơn trong DB: ${billCount}`);

    // Kiểm tra đơn thuốc
    const prescriptionCount = await Prescription.countDocuments();
    console.log(`✅ Số đơn thuốc trong DB: ${prescriptionCount}`);

    console.log('─────────────────────────────────────────\n');

    console.log('🎉 Seed dữ liệu hoàn tất! Hệ thống sẵn sàng để test.\n');

    // 📝 HƯỚNG DẪN ĐĂNG NHẬP
    console.log('📝 HƯỚNG DẪN ĐĂNG NHẬP TEST:');
    console.log('─────────────────────────────────────────');
    console.log('👨‍⚕️  BÁC SĨ:');
    doctors.forEach((doctor, idx) => {
      console.log(`   Email: ${doctor.email}`);
      console.log(`   Password: Doctor@2025`);
      if (idx === 0) console.log('');
    });
    console.log('\n🤝 BỆNH NHÂN (Sample):');
    patients.slice(0, 3).forEach((p, idx) => {
      console.log(`   Email: ${p.user.email}`);
      console.log(`   Password: Patient@2025`);
      if (idx < 2) console.log('');
    });
    console.log('\n─────────────────────────────────────────\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi seed dữ liệu:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Chạy seed
seedDatabase();

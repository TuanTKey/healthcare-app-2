/**
 * Seed Script - Tạo test data cho Prescriptions và Bills
 * Chạy: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Prescription = require('../models/prescription.model');
const Bill = require('../models/bill.model');
const Medication = require('../models/medication.model');
const User = require('../models/user.model');
const MedicalRecord = require('../models/medicalRecord.model');

const { generateMedicalCode } = require('../utils/healthcare.utils');
const { appConfig } = require('../config');

async function seedData() {
  try {
    console.log('🌱 Bắt đầu seed dữ liệu...');

    // Kết nối MongoDB
    const mongoUri = process.env.MONGODB_URI || appConfig.db.uri;
    console.log(`📍 Kết nối tới: ${mongoUri.split('@')[1] || 'Local MongoDB'}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Kết nối MongoDB thành công');

    // Xóa dữ liệu cũ (optional)
    // await Prescription.deleteMany({});
    // await Bill.deleteMany({});
    // console.log('🗑️  Xóa dữ liệu cũ');

    // ========== TẠO MEDICATIONS ==========
    console.log('\n📦 Tạo dữ liệu Medications...');
    
    const medications = [
      {
        medicationId: 'MED001',
        name: 'Paracetamol',
        genericName: 'Acetaminophen',
        brandName: 'Tylenol',
        category: 'Analgesic',
        type: 'TABLET',
        strength: { value: 500, unit: 'mg' },
        form: 'Tablet',
        stock: {
          current: 500,
          minimum: 50,
          maximum: 1000,
          unit: 'tablets',
          reorderLevel: 100
        }
      },
      {
        medicationId: 'MED002',
        name: 'Amoxicillin',
        genericName: 'Amoxicillin Trihydrate',
        brandName: 'Augmentin',
        category: 'Antibiotic',
        type: 'CAPSULE',
        strength: { value: 250, unit: 'mg' },
        form: 'Capsule',
        stock: {
          current: 300,
          minimum: 30,
          maximum: 500,
          unit: 'capsules',
          reorderLevel: 80
        }
      },
      {
        medicationId: 'MED003',
        name: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        brandName: 'Glucophage',
        category: 'Antidiabetic',
        type: 'TABLET',
        strength: { value: 500, unit: 'mg' },
        form: 'Tablet',
        stock: {
          current: 400,
          minimum: 40,
          maximum: 800,
          unit: 'tablets',
          reorderLevel: 100
        }
      },
      {
        medicationId: 'MED004',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        brandName: 'Prinivil',
        category: 'Antihypertensive',
        type: 'TABLET',
        strength: { value: 10, unit: 'mg' },
        form: 'Tablet',
        stock: {
          current: 250,
          minimum: 25,
          maximum: 500,
          unit: 'tablets',
          reorderLevel: 60
        }
      },
      {
        medicationId: 'MED005',
        name: 'Omeprazole',
        genericName: 'Omeprazole',
        brandName: 'Prilosec',
        category: 'Proton Pump Inhibitor',
        type: 'CAPSULE',
        strength: { value: 20, unit: 'mg' },
        form: 'Capsule',
        stock: {
          current: 350,
          minimum: 35,
          maximum: 700,
          unit: 'capsules',
          reorderLevel: 90
        }
      }
    ];

    for (const med of medications) {
      const exists = await Medication.findOne({ medicationId: med.medicationId });
      if (!exists) {
        await Medication.create(med);
        console.log(`  ✅ Tạo thuốc: ${med.name}`);
      }
    }

    // ========== LẤY ADMIN VÀ DOCTOR ==========
    console.log('\n👨‍⚕️  Lấy dữ liệu Users...');
    
    let admin = await User.findOne({ email: 'admin@healthcare.com' });
    if (!admin) {
      console.log('❌ Không tìm thấy admin user');
      process.exit(1);
    }
    console.log(`  ✅ Admin: ${admin.email}`);

    // Tạo doctor user nếu không có
    let doctor = await User.findOne({ role: 'DOCTOR' });
    if (!doctor) {
      doctor = await User.create({
        email: 'doctor@healthcare.com',
        password: 'hashed_password_123', // Sẽ bị hash bởi middleware
        role: 'DOCTOR',
        status: 'ACTIVE',
        personalInfo: {
          firstName: 'Nguyễn',
          lastName: 'Bác Sĩ',
          phone: '0901234567',
          gender: 'MALE',
          dateOfBirth: '1985-05-15'
        }
      });
      console.log(`  ✅ Tạo doctor: ${doctor.email}`);
    } else {
      console.log(`  ✅ Doctor tồn tại: ${doctor.email}`);
    }

    // Tạo patient user nếu không có
    let patient = await User.findOne({ role: 'PATIENT' });
    if (!patient) {
      patient = await User.create({
        email: 'patient@healthcare.com',
        password: 'hashed_password_123',
        role: 'PATIENT',
        status: 'ACTIVE',
        personalInfo: {
          firstName: 'Trần',
          lastName: 'Bệnh Nhân',
          phone: '0987654321',
          gender: 'FEMALE',
          dateOfBirth: '1995-08-20'
        }
      });
      console.log(`  ✅ Tạo patient: ${patient.email}`);
    } else {
      console.log(`  ✅ Patient tồn tại: ${patient.email}`);
    }

    // ========== TẠO PRESCRIPTIONS ==========
    console.log('\n💊 Tạo dữ liệu Prescriptions...');

    const prescriptionCount = await Prescription.countDocuments();
    if (prescriptionCount === 0) {
      const medList = await Medication.find();
      
      for (let i = 0; i < 5; i++) {
        const prescriptionId = `RX${String(i + 1).padStart(6, '0')}`;
        const existingRx = await Prescription.findOne({ prescriptionId });
        
        if (!existingRx) {
          const prescription = await Prescription.create({
            prescriptionId,
            patientId: patient._id,
            doctorId: doctor._id,
            issueDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), // i tuần trước
            validityDays: 30,
            medications: [
              {
                medicationId: medList[i % medList.length]._id,
                name: medList[i % medList.length].name,
                genericName: medList[i % medList.length].genericName,
                dosage: {
                  value: 500,
                  unit: 'mg',
                  form: medList[i % medList.length].form
                },
                frequency: {
                  timesPerDay: (i % 3) + 1,
                  interval: `${(i % 3) + 1} times per day`,
                  instructions: 'Take with water'
                },
                duration: {
                  value: 7 + i,
                  unit: 'days'
                },
                route: 'ORAL',
                totalQuantity: (7 + i) * ((i % 3) + 1),
                refills: {
                  allowed: 2,
                  used: 0
                }
              }
            ],
            notes: `Test prescription ${i + 1}`,
            status: i === 0 ? 'ACTIVE' : i < 3 ? 'COMPLETED' : 'EXPIRED',
            createdBy: doctor._id
          });
          console.log(`  ✅ Tạo đơn thuốc: ${prescriptionId} - ${prescription.medications[0].name}`);
        }
      }
    } else {
      console.log(`  ℹ️  Đã có ${prescriptionCount} prescriptions`);
    }

    // ========== TẠO BILLS ==========
    console.log('\n💰 Tạo dữ liệu Bills...');

    const billCount = await Bill.countDocuments();
    if (billCount === 0) {
      for (let i = 0; i < 5; i++) {
        const billNumber = `HD${String(i + 1).padStart(6, '0')}`;
        const existingBill = await Bill.findOne({ billNumber });
        
        if (!existingBill) {
          const servicePrice = (i + 1) * 100000; // 100k, 200k, 300k, ...
          const taxRate = 10;
          const discount = i === 2 ? 50000 : 0; // bill thứ 3 có discount
          
          const subtotal = servicePrice - discount;
          const tax = (subtotal * taxRate) / 100;
          const grandTotal = subtotal + tax;
          const amountPaid = i === 0 ? grandTotal : i === 1 ? grandTotal / 2 : 0; // Một số đã thanh toán
          
          const bill = await Bill.create({
            billId: `BILL${String(i + 1).padStart(6, '0')}`,
            billNumber,
            patientId: patient._id,
            issueDate: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000),
            dueDate: new Date(Date.now() + (30 - i * 5) * 24 * 60 * 60 * 1000),
            billType: ['CONSULTATION', 'LABORATORY', 'PHARMACY', 'PROCEDURE', 'HOSPITALIZATION'][i % 5],
            services: [
              {
                serviceCode: `SVC${i + 1}`,
                serviceName: ['Consultation', 'Lab Test', 'Medication', 'Procedure', 'Hospital Stay'][i % 5],
                description: `Service ${i + 1} for patient`,
                quantity: 1,
                unitPrice: servicePrice,
                discount: discount,
                taxRate: taxRate,
                total: servicePrice - discount
              }
            ],
            subtotal: subtotal,
            totalDiscount: discount,
            totalTax: tax,
            grandTotal: grandTotal,
            amountPaid: amountPaid,
            balanceDue: grandTotal - amountPaid,
            status: amountPaid === 0 ? (i > 2 ? 'OVERDUE' : 'ISSUED') : amountPaid === grandTotal ? 'PAID' : 'PARTIAL',
            notes: `Test bill ${i + 1}`,
            createdBy: admin._id
          });
          console.log(`  ✅ Tạo hoá đơn: ${billNumber} - ${bill.grandTotal.toLocaleString()} VND (${bill.status})`);
        }
      }
    } else {
      console.log(`  ℹ️  Đã có ${billCount} bills`);
    }

    console.log('\n✅ Seed dữ liệu thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi seed dữ liệu:', error);
    process.exit(1);
  }
}

// Chạy seed
seedData();

/**
 * Script tạo đơn thuốc cho các lịch hẹn đã hoàn thành
 * Dùng để test chức năng tạo hóa đơn từ đơn thuốc
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const Appointment = require('../models/appointment.model');
  const Prescription = require('../models/prescription.model');
  const User = require('../models/user.model');

  // Lấy các lịch hẹn đã hoàn thành
  const completedAppointments = await Appointment.find({ status: 'COMPLETED' })
    .populate('patientId', 'personalInfo email')
    .populate('doctorId', 'personalInfo email')
    .sort({ updatedAt: -1 })
    .limit(5);

  console.log('\n📋 === LỊCH HẸN ĐÃ HOÀN THÀNH ===');
  
  if (completedAppointments.length === 0) {
    console.log('❌ Không có lịch hẹn nào đã hoàn thành');
    await mongoose.disconnect();
    return;
  }

  completedAppointments.forEach((apt, i) => {
    console.log(`\n--- Lịch hẹn ${i + 1} ---`);
    console.log('Bệnh nhân:', apt.patientId?.personalInfo?.firstName, apt.patientId?.personalInfo?.lastName);
    console.log('Patient ID:', apt.patientId?._id?.toString());
    console.log('Bác sĩ:', apt.doctorId?.personalInfo?.firstName, apt.doctorId?.personalInfo?.lastName);
    console.log('Doctor ID:', apt.doctorId?._id?.toString());
    console.log('Ngày khám:', apt.appointmentDate);
    console.log('Lý do:', apt.reason);
  });

  // Tạo đơn thuốc cho 2 lịch hẹn đầu tiên
  console.log('\n\n💊 === TẠO ĐƠN THUỐC ===');

  const prescriptionsToCreate = [
    {
      appointment: completedAppointments[0],
      medications: [
        {
          name: 'Paracetamol 500mg',
          dosage: { value: 500, unit: 'mg', form: 'tablet', unitPrice: 5000 },
          frequency: { timesPerDay: 3, instructions: 'Uống sau ăn' },
          duration: { value: 5, unit: 'days' },
          route: 'ORAL',
          totalQuantity: 15,
          instructions: 'Uống khi sốt hoặc đau'
        },
        {
          name: 'Vitamin C 1000mg',
          dosage: { value: 1000, unit: 'mg', form: 'tablet', unitPrice: 3000 },
          frequency: { timesPerDay: 1, instructions: 'Uống buổi sáng' },
          duration: { value: 10, unit: 'days' },
          route: 'ORAL',
          totalQuantity: 10,
          instructions: 'Tăng cường sức đề kháng'
        },
        {
          name: 'Amoxicillin 500mg',
          dosage: { value: 500, unit: 'mg', form: 'capsule', unitPrice: 8000 },
          frequency: { timesPerDay: 2, instructions: 'Uống sáng và tối' },
          duration: { value: 7, unit: 'days' },
          route: 'ORAL',
          totalQuantity: 14,
          instructions: 'Kháng sinh, uống đủ liều'
        }
      ],
      diagnosis: 'Cảm cúm, viêm họng nhẹ'
    },
    {
      appointment: completedAppointments[1] || completedAppointments[0],
      medications: [
        {
          name: 'Omeprazole 20mg',
          dosage: { value: 20, unit: 'mg', form: 'capsule', unitPrice: 10000 },
          frequency: { timesPerDay: 1, instructions: 'Uống trước ăn sáng 30 phút' },
          duration: { value: 14, unit: 'days' },
          route: 'ORAL',
          totalQuantity: 14,
          instructions: 'Điều trị trào ngược dạ dày'
        },
        {
          name: 'Domperidone 10mg',
          dosage: { value: 10, unit: 'mg', form: 'tablet', unitPrice: 6000 },
          frequency: { timesPerDay: 3, instructions: 'Uống trước ăn 15 phút' },
          duration: { value: 7, unit: 'days' },
          route: 'ORAL',
          totalQuantity: 21,
          instructions: 'Chống buồn nôn'
        }
      ],
      diagnosis: 'Đau dạ dày, trào ngược'
    }
  ];

  const createdPrescriptions = [];

  for (let i = 0; i < prescriptionsToCreate.length; i++) {
    const data = prescriptionsToCreate[i];
    const apt = data.appointment;
    
    if (!apt || !apt.patientId || !apt.doctorId) {
      console.log(`⚠️  Bỏ qua đơn thuốc ${i + 1}: Thiếu thông tin`);
      continue;
    }

    // Tạo mã đơn thuốc
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prescriptionId = `RX-${dateStr}-${randomNum}`;

    // Kiểm tra xem đã có đơn thuốc chưa
    const existingPrescription = await Prescription.findOne({ prescriptionId });
    if (existingPrescription) {
      console.log(`⚠️  Mã đơn thuốc ${prescriptionId} đã tồn tại, tạo mã mới...`);
      continue;
    }

    const prescription = new Prescription({
      prescriptionId,
      patientId: apt.patientId._id,
      doctorId: apt.doctorId._id,
      medications: data.medications,
      notes: data.diagnosis,
      specialInstructions: data.diagnosis,
      issueDate: new Date(),
      validityDays: 30,
      status: 'ACTIVE',
      drugInteractionsChecked: true,
      createdBy: apt.doctorId._id
    });

    await prescription.save();
    createdPrescriptions.push(prescription);

    console.log(`\n✅ Đã tạo đơn thuốc ${i + 1}:`);
    console.log('   📋 Mã đơn:', prescription.prescriptionId);
    console.log('   👤 Bệnh nhân:', apt.patientId?.personalInfo?.firstName, apt.patientId?.personalInfo?.lastName);
    console.log('   👨‍⚕️ Bác sĩ:', apt.doctorId?.personalInfo?.firstName, apt.doctorId?.personalInfo?.lastName);
    console.log('   💊 Số thuốc:', prescription.medications.length);
    console.log('   📝 Chẩn đoán:', data.diagnosis);
  }

  // Hiển thị tất cả đơn thuốc
  console.log('\n\n📜 === TẤT CẢ ĐƠN THUỐC ===');
  const allPrescriptions = await Prescription.find({})
    .populate('patientId', 'personalInfo')
    .populate('doctorId', 'personalInfo')
    .sort({ createdAt: -1 });

  allPrescriptions.forEach((rx, i) => {
    console.log(`\n--- Đơn thuốc ${i + 1} ---`);
    console.log('🔖 Mã đơn:', rx.prescriptionId);
    console.log('👤 Bệnh nhân:', rx.patientId?.personalInfo?.firstName, rx.patientId?.personalInfo?.lastName);
    console.log('👨‍⚕️ Bác sĩ:', rx.doctorId?.personalInfo?.firstName, rx.doctorId?.personalInfo?.lastName);
    console.log('💊 Số thuốc:', rx.medications?.length);
    console.log('📌 Trạng thái:', rx.status);
    console.log('💰 Đã tạo bill:', rx.billCreated ? 'Có' : 'Chưa');
    
    if (rx.medications?.length > 0) {
      console.log('   Danh sách thuốc:');
      rx.medications.forEach((med, j) => {
        const price = med.dosage?.unitPrice || 10000;
        console.log(`   ${j + 1}. ${med.name} - SL: ${med.totalQuantity} - Giá: ${price.toLocaleString('vi-VN')}đ`);
      });
    }
  });

  console.log('\n\n🎯 === HƯỚNG DẪN TEST ===');
  console.log('1. Mở app mobile với tài khoản BILLING_STAFF');
  console.log('2. Vào màn hình "Tạo hóa đơn"');
  console.log('3. Nhập một trong các mã đơn thuốc sau để test:');
  allPrescriptions.filter(rx => !rx.billCreated).forEach((rx) => {
    console.log(`   📋 ${rx.prescriptionId}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Hoàn thành!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const appConfig = require('../config/app.config');

async function createBill() {
  await mongoose.connect(appConfig.db.uri);
  
  const Prescription = require('../models/prescription.model');
  const Bill = require('../models/bill.model');
  const User = require('../models/user.model');
  
  // Load Medication model for population
  require('../models/medication.model');
  
  const rxId = process.argv[2] || 'RX-20251202-281';
  
  // Tìm đơn thuốc
  const prescription = await Prescription.findOne({ prescriptionId: rxId })
    .populate('patientId')
    .populate('medications.medicationId');
  
  if (!prescription) {
    console.log('❌ Không tìm thấy đơn thuốc:', rxId);
    process.exit(1);
  }
  
  console.log('📋 Đơn thuốc:', prescription.prescriptionId);
  console.log('👤 Bệnh nhân:', prescription.patientId?.personalInfo?.firstName, prescription.patientId?.personalInfo?.lastName);
  
  // Kiểm tra đã có hóa đơn chưa
  const existingBill = await Bill.findOne({ prescriptionId: prescription._id });
  if (existingBill) {
    console.log('⚠️ Đã có hóa đơn cho đơn thuốc này:', existingBill.billNumber);
    await mongoose.disconnect();
    return;
  }
  
  // Tìm admin user để làm createdBy
  const admin = await User.findOne({ role: { $in: ['SUPER_ADMIN', 'ADMIN', 'BILLING_STAFF'] } });
  
  // Tạo services từ medications
  const services = prescription.medications.map(med => ({
    serviceCode: med.medicationId?.code || 'MED',
    serviceName: med.medicationId?.name || med.name || 'Thuốc',
    description: (med.dosage || '') + ' - ' + (med.frequency || ''),
    quantity: med.quantity || 1,
    unitPrice: med.medicationId?.price || 50000,
    discount: 0,
    taxRate: 0,
    total: (med.quantity || 1) * (med.medicationId?.price || 50000)
  }));
  
  const subtotal = services.reduce((sum, s) => sum + s.total, 0);
  
  // Tạo bill number - lấy số lớn nhất hiện có + 1
  const today = new Date();
  const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
  
  // Tìm bill number lớn nhất
  const lastBill = await Bill.findOne().sort({ billNumber: -1 });
  let nextNum = 1;
  if (lastBill && lastBill.billNumber) {
    const match = lastBill.billNumber.match(/HD(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }
  
  const billNumber = 'HD' + String(nextNum).padStart(6, '0');
  const billId = 'BILL-' + dateStr + '-' + String(nextNum).padStart(3, '0');
  
  const bill = new Bill({
    billId,
    billNumber,
    patientId: prescription.patientId._id,
    prescriptionId: prescription._id,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    billType: 'PHARMACY',
    services,
    subtotal,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: subtotal,
    amountPaid: 0,
    balanceDue: subtotal,
    status: 'ISSUED',
    createdBy: admin._id,
    notes: 'Hóa đơn từ đơn thuốc ' + prescription.prescriptionId
  });
  
  await bill.save();
  
  console.log('✅ Đã tạo hóa đơn mới:');
  console.log('   - Mã HĐ:', bill.billNumber);
  console.log('   - Tổng tiền:', bill.grandTotal.toLocaleString('vi-VN') + 'đ');
  console.log('   - Trạng thái:', bill.status);
  console.log('   - Dịch vụ:', services.length, 'mục');
  
  await mongoose.disconnect();
}

createBill().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});

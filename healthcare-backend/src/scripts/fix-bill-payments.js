/**
 * Script để fix các hóa đơn đã thanh toán nhưng chưa cập nhật đúng amountPaid và status
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const Bill = require('../models/bill.model');

  // Tìm tất cả hóa đơn có payments nhưng amountPaid = 0 hoặc status không đúng
  const bills = await Bill.find({
    'payments.0': { $exists: true }
  });

  console.log(`\n📋 Tìm thấy ${bills.length} hóa đơn có payments`);

  for (const bill of bills) {
    const totalPaid = bill.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const expectedBalanceDue = bill.grandTotal - totalPaid;
    
    let expectedStatus = bill.status;
    if (totalPaid >= bill.grandTotal) {
      expectedStatus = 'PAID';
    } else if (totalPaid > 0) {
      expectedStatus = 'PARTIAL';
    }

    const needsUpdate = 
      bill.amountPaid !== totalPaid || 
      bill.balanceDue !== expectedBalanceDue ||
      bill.status !== expectedStatus;

    if (needsUpdate) {
      console.log(`\n🔧 Fixing bill ${bill.billNumber}:`);
      console.log(`   - Payments: ${bill.payments.length} (Total: ${totalPaid.toLocaleString('vi-VN')}đ)`);
      console.log(`   - amountPaid: ${bill.amountPaid} → ${totalPaid}`);
      console.log(`   - balanceDue: ${bill.balanceDue} → ${expectedBalanceDue}`);
      console.log(`   - status: ${bill.status} → ${expectedStatus}`);

      bill.amountPaid = totalPaid;
      bill.balanceDue = expectedBalanceDue;
      bill.status = expectedStatus;
      
      await bill.save();
      console.log(`   ✅ Fixed!`);
    } else {
      console.log(`\n✓ Bill ${bill.billNumber} is OK`);
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ Hoàn thành!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

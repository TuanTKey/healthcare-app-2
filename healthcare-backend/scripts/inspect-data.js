const mongoose = require('mongoose');
const appConfig = require('../src/config/app.config');

// Load models
const User = require('../src/models/user.model');
const Bill = require('../src/models/bill.model');
const Prescription = require('../src/models/prescription.model');
const Patient = require('../src/models/patient.model');
const Appointment = require('../src/models/appointment.model');

async function inspect() {
  const uri = appConfig.db.uri;
  console.log(`Connecting to MongoDB: ${uri}`);
  try {
    await mongoose.connect(uri, { dbName: 'healthcare', serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected');

    const [userCount, billCount, rxCount, patientCount, apptCount] = await Promise.all([
      User.countDocuments({}),
      Bill.countDocuments({}),
      Prescription.countDocuments({}),
      Patient.countDocuments({}),
      Appointment.countDocuments({}),
    ]);

    console.log('Counts:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Bills: ${billCount}`);
    console.log(`- Prescriptions: ${rxCount}`);
    console.log(`- Patients: ${patientCount}`);
    console.log(`- Appointments: ${apptCount}`);

    const users = await User.find({}, { email: 1, role: 1, status: 1 }).limit(5).lean();
    const bills = await Bill.find({}, { billCode: 1, status: 1, grandTotal: 1, amountPaid: 1 }).sort({ createdAt: -1 }).limit(5).lean();
    const rxs = await Prescription.find({}, { prescriptionCode: 1, status: 1, totalAmount: 1 }).sort({ createdAt: -1 }).limit(5).lean();

    console.log('\nSample Users (max 5):');
    console.table(users);

    console.log('\nSample Bills (max 5):');
    console.table(bills);

    console.log('\nSample Prescriptions (max 5):');
    console.table(rxs);

    // Revenue summary: PAID grandTotal sum
    const paidBills = await Bill.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);
    const summary = paidBills[0] || { total: 0, count: 0 };
    console.log(`\nRevenue (PAID grandTotal): ${summary.total} from ${summary.count} bills`);
  } catch (e) {
    console.error('❌ Inspect failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

inspect();

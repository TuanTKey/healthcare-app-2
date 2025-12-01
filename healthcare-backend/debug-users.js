const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/models/user.model');
  
  // Đếm trực tiếp
  const total = await User.countDocuments();
  const notDeleted = await User.countDocuments({isDeleted: false});
  const deleted = await User.countDocuments({isDeleted: true});
  const notDeletedOrMissing = await User.countDocuments({
    $or: [
      {isDeleted: false}, 
      {isDeleted: null}, 
      {isDeleted: {$exists: false}}
    ]
  });
  
  console.log('=== THONG KE USERS ===');
  console.log('Tong users:', total);
  console.log('isDeleted: false =>', notDeleted);
  console.log('isDeleted: true =>', deleted);
  console.log('isDeleted: false/null/missing =>', notDeletedOrMissing);
  
  // Kiểm tra users không có isDeleted hoặc isDeleted = null
  const usersRaw = await User.collection.find({}).toArray();
  let withFalse = 0, withTrue = 0, withNull = 0, withMissing = 0;
  
  usersRaw.forEach(u => {
    if (u.isDeleted === false) withFalse++;
    else if (u.isDeleted === true) withTrue++;
    else if (u.isDeleted === null) withNull++;
    else withMissing++;
  });
  
  console.log('\n=== RAW DATA CHECK ===');
  console.log('isDeleted = false:', withFalse);
  console.log('isDeleted = true:', withTrue);
  console.log('isDeleted = null:', withNull);
  console.log('isDeleted missing:', withMissing);
  
  // Aggregate test
  const aggResult = await User.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    {
      $group: {
        _id: '$role',
        total: { $sum: 1 }
      }
    }
  ]);
  
  console.log('\n=== AGGREGATE (isDeleted != true) ===');
  aggResult.forEach(r => console.log(r._id, ':', r.total));
  
  process.exit(0);
}).catch(e => { 
  console.error(e); 
  process.exit(1); 
});

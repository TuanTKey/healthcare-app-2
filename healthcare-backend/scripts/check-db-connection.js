// Quick MongoDB connectivity check
const mongoose = require('mongoose');
const appConfig = require('../src/config/app.config');

async function main() {
  const uri = appConfig.db.uri;
  console.log(`Connecting to MongoDB: ${uri}`);
  try {
    const start = Date.now();
    await mongoose.connect(uri, {
      dbName: 'healthcare',
      serverSelectionTimeoutMS: 5000,
    });
    const ms = Date.now() - start;
    console.log(`✅ Connected in ${ms}ms`);

    // Basic ping without admin privileges
    const ping = await mongoose.connection.db.command({ ping: 1 });
    console.log('Ping result:', ping.ok === 1 ? 'ok' : ping);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();

require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

/**
 * Database Cleaning / Reset Utility
 * Allows wiping clinical and operational test data while preserving system foundations (or wiping everything).
 *
 * Usage:
 *   node scripts/clean-database.js --clinical   (Cleans Patients, Visits, Appointments, Lab Orders, Audit Logs)
 *   node scripts/clean-database.js --all        (Drops the entire quantum_careone database)
 */
const cleanDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set in secrets/backend.env!');
    }

    const mode = process.argv[2] || '--clinical';

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log(`Connected to database: ${mongoose.connection.name}`);

    if (mode === '--all') {
      console.log('⚠️ WARNING: Dropping entire database...');
      await mongoose.connection.dropDatabase();
      console.log('✅ Entire database dropped. You can re-run seed scripts to rebuild cleanly.');
    } else {
      console.log('🧹 Cleaning operational/testing collections (Patients, Visits, Appointments, AuditLogs)...');
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const toClean = ['patients', 'visits', 'appointments', 'auditlogs', 'patientdeletionrequests', 'bills'];

      for (const colName of toClean) {
        if (collectionNames.includes(colName)) {
          const result = await mongoose.connection.db.collection(colName).deleteMany({});
          console.log(`  - Cleared "${colName}": ${result.deletedCount} documents deleted.`);
        }
      }

      console.log('✅ Operational collections cleaned successfully. Roles, Departments, and Staff are preserved.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Clean failed:', error);
    process.exit(1);
  }
};

cleanDatabase();

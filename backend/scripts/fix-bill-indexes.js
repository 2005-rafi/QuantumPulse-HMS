/**
 * scripts/fix-bill-indexes.js
 * Drops the old visitId unique index and configures partialFilterExpression for visitId & admissionId.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../src/core/database/connection');

async function fixBillIndexes() {
  await connectDB();
  const db = mongoose.connection.db;
  const billsCollection = db.collection('bills');

  console.log('Inspecting existing indexes on bills collection...');
  const indexes = await billsCollection.indexes();
  console.log('Existing indexes:', indexes.map((i) => i.name));

  for (const idx of indexes) {
    if (idx.name.includes('visitId')) {
      console.log(`Dropping index: ${idx.name}`);
      await billsCollection.dropIndex(idx.name);
    }
    if (idx.name.includes('admissionId')) {
      console.log(`Dropping index: ${idx.name}`);
      await billsCollection.dropIndex(idx.name);
    }
  }

  console.log('Creating partial unique indexes for visitId and admissionId...');
  await billsCollection.createIndex(
    { visitId: 1 },
    {
      name: 'visitId_1',
      unique: true,
      partialFilterExpression: { visitId: { $type: 'objectId' } },
    }
  );

  await billsCollection.createIndex(
    { admissionId: 1 },
    {
      name: 'admissionId_1',
      unique: true,
      partialFilterExpression: { admissionId: { $type: 'objectId' } },
    }
  );

  console.log('Indexes updated successfully.');
  process.exit(0);
}

fixBillIndexes().catch((err) => {
  console.error('Index fix error:', err);
  process.exit(1);
});

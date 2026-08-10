const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/hms_opd').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('identities').updateOne({username: 'reception1'}, {'$set': {passwordHash: await bcrypt.hash('Reception@1234', 10)}});
  await db.collection('identities').updateOne({username: 'nurse1'}, {'$set': {passwordHash: await bcrypt.hash('Nurse@1234', 10)}});
  await db.collection('identities').updateOne({username: 'doctor1'}, {'$set': {passwordHash: await bcrypt.hash('Doctor@1234', 10)}});
  await db.collection('identities').updateOne({username: 'pharmacy1'}, {'$set': {passwordHash: await bcrypt.hash('Pharmacy@1234', 10)}});
  await db.collection('identities').updateOne({username: 'lab1'}, {'$set': {passwordHash: await bcrypt.hash('Lab@12345', 10)}});
  console.log('Passwords reset!');
  process.exit(0);
});

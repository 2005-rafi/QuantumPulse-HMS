require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const config = require('../src/core/config');

async function dropDB() {
  console.log('Connecting to MongoDB to DROP DATABASE...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected. Dropping...');
  await mongoose.connection.db.dropDatabase();
  console.log('Database dropped completely.');
  await mongoose.disconnect();
}

dropDB().catch(console.error);

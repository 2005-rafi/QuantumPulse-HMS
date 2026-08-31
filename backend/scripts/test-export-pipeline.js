/**
 * Test script for Export Pipeline with Date Range and Multiple Templates
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const PatientExportService = require('../src/modules/patient/patient.export.service');
const { Writable } = require('stream');

class TestWriteStream extends Writable {
  constructor() {
    super();
    this.chunks = [];
  }
  _write(chunk, encoding, callback) {
    this.chunks.push(chunk);
    callback();
  }
  getContent() {
    return Buffer.concat(this.chunks).toString('utf8');
  }
}

async function runExportTests() {
  console.log('─── Testing Patient Export Service ───');
  
  // Connect to DB if needed
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';
    await mongoose.connect(connStr);
    console.log('Connected to MongoDB');

    // 1. Test Walk-in Today
    const stream1 = new TestWriteStream();
    await PatientExportService.streamExport({
      reportType: 'walkin',
      scope: 'today',
      format: 'csv',
      outputStream: stream1,
    });
    console.log(`[Walk-in Today] CSV length: ${stream1.getContent().length} chars`);

    // 2. Test Financial Date Range
    const stream2 = new TestWriteStream();
    await PatientExportService.streamExport({
      reportType: 'financial',
      scope: 'dateRange',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      format: 'csv',
      outputStream: stream2,
    });
    console.log(`[Financial DateRange] CSV length: ${stream2.getContent().length} chars`);

    // 3. Test Demographics All
    const stream3 = new TestWriteStream();
    await PatientExportService.streamExport({
      reportType: 'demographics',
      scope: 'all',
      format: 'csv',
      outputStream: stream3,
    });
    console.log(`[Demographics All] CSV length: ${stream3.getContent().length} chars`);

    console.log('🎉 Export Pipeline Tests Completed Successfully!');
  } catch (err) {
    console.error('Export test failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runExportTests();

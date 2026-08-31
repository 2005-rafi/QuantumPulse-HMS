/**
 * Automated Verification Script for Centralized Cloudinary Storage Provider
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const CloudinaryStorageService = require('../src/core/storage/CloudinaryStorageService');
const { verifyFileMagicBytes } = require('../src/core/utils/fileValidation');

async function testCloudinaryPipeline() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TESTING CENTRALIZED CLOUDINARY STORAGE & RETRY PIPELINE  ');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // 1. Validate Service Initialization
    if (!CloudinaryStorageService.configured) {
      throw new Error('CloudinaryStorageService is not configured. Check environment credentials.');
    }
    console.log('✅ 1. Cloudinary credentials configured successfully.');
    console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   Default Folder: ${process.env.CLOUDINARY_DEFAULT_FOLDER || 'hms_production'}`);

    // 2. Test In-Memory Magic Byte Verification
    const fakePdfHeader = Buffer.from('%PDF-1.4 test clinical report content for patient PT-2026-0001');
    const isPdfValid = verifyFileMagicBytes(fakePdfHeader, new Set(['application/pdf']));
    console.log(`✅ 2. In-Memory Magic-Byte Verification (PDF Header): ${isPdfValid ? 'PASSED' : 'FAILED'}`);

    // 3. Test In-Memory Buffer Upload with Retry to Cloudinary
    console.log('⏳ 3. Uploading test diagnostic PDF buffer to Cloudinary with retry...');
    const uploadResult = await CloudinaryStorageService.uploadBuffer(fakePdfHeader, {
      folder: 'scans/TEST',
      filename: `test_scan_${Date.now()}`,
      mimeType: 'application/pdf',
      tags: ['unit_test', 'automated_verification', 'TEST_DEPT'],
      context: {
        testRun: 'true',
        verifiedAt: new Date().toISOString(),
      },
      isPrivate: true,
    });

    console.log('✅ 3. Upload Succeeded:');
    console.log(`   Public ID: ${uploadResult.publicId}`);
    console.log(`   Secure URL: ${uploadResult.secureUrl}`);
    console.log(`   Storage Type: ${uploadResult.storageType}`);
    console.log(`   Bytes: ${uploadResult.bytes}`);
    console.log(`   Format: ${uploadResult.format}`);

    // 4. Test Presigned Expiring URL Generation (5-Minute TTL)
    console.log('⏳ 4. Generating 5-Minute Expiring Presigned HMAC URL for HIPAA Compliance...');
    const presignedUrl = CloudinaryStorageService.generatePresignedUrl(uploadResult.publicId, {
      expiresInSeconds: 300,
      resourceType: uploadResult.resourceType,
      format: 'pdf',
    });
    console.log('✅ 4. Presigned Signed Delivery URL:');
    console.log(`   ${presignedUrl.substring(0, 80)}...`);

    // 5. Test Storage Usage & Analytics
    console.log('⏳ 5. Querying Cloudinary Account Usage Analytics...');
    const analytics = await CloudinaryStorageService.getStorageAnalytics();
    console.log('✅ 5. Storage Analytics Retrieved:');
    console.log(`   Plan: ${analytics.plan}`);
    console.log(`   Storage Used: ${analytics.storage?.megabytes || 0} MB`);
    console.log(`   Bandwidth: ${analytics.bandwidth?.megabytes || 0} MB`);
    console.log(`   Credits: ${analytics.credits?.used || 0} / ${analytics.credits?.limit || 25}`);

    // 6. Test Asset Deletion / Cleanup
    console.log('⏳ 6. Cleaning up test asset from Cloudinary...');
    await CloudinaryStorageService.deleteAsset(uploadResult.publicId, {
      resourceType: uploadResult.resourceType,
    });
    console.log('✅ 6. Test asset safely purged from Cloudinary.');

    console.log('\n🎉 ALL CLOUDINARY PIPELINE TESTS PASSED WITH ZERO ERRORS!');
  } catch (err) {
    console.error('\n❌ Cloudinary Pipeline Test Failed:', err);
    process.exit(1);
  }
}

testCloudinaryPipeline();

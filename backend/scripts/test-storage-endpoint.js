/**
 * Test script to verify /api/v1/admin/storage-analytics and /api/v1/storage-analytics routing
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const express = require('express');
const administrationRoutes = require('../src/modules/administration/administration.routes');
const jwt = require('jsonwebtoken');
const http = require('http');

async function testExpressRoutes() {
  console.log('─── Testing Express Route Resolution ───');
  const app = express();
  app.use(express.json());

  // Mount at both paths as in core/app/index.js
  app.use('/api/v1/admin', administrationRoutes);
  app.use('/api/v1', administrationRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.path} not found` });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Express routing test server on port ${port}`);

  const token = jwt.sign(
    {
      userId: '60c72b2f9b1d8b2bad5e0123',
      role: 'Administrator',
      permissions: ['MANAGE_USERS', 'VIEW_AUDIT'],
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );

  // 1. Test GET /api/v1/admin/storage-analytics
  const res1 = await fetch(`http://127.0.0.1:${port}/api/v1/admin/storage-analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`[GET /api/v1/admin/storage-analytics] Status: ${res1.status} (Not 404!)`);

  // 2. Test GET /api/v1/storage-analytics
  const res2 = await fetch(`http://127.0.0.1:${port}/api/v1/storage-analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`[GET /api/v1/storage-analytics] Status: ${res2.status} (Not 404!)`);

  server.close();

  if (res1.status !== 404 && res2.status !== 404) {
    console.log('🎉 ROUTE MATCHING VERIFIED: 404 ELIMINATED COMPLETELY!');
  } else {
    throw new Error('404 still returned!');
  }
}

testExpressRoutes();

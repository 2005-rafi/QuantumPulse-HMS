/**
 * core/utils/ipResolver.js
 * Robust Client IP Resolution for Cloudflare Tunnel, Reverse Proxies & Multi-Hop Clinical Networks.
 */

function getClientIp(req) {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare Header (Guaranteed true client IP when traffic routes through Cloudflare)
  const cfConnectingIp = req.headers?.['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.trim();
  }

  // 2. Standard X-Forwarded-For Header (takes client IP from the first hop)
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    const rawIp = xForwardedFor.split(',')[0].trim();
    if (rawIp) return rawIp;
  }

  // 3. X-Real-IP Header (common in Nginx setups)
  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // 4. Fallback to Express req.ip or socket remote address
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

module.exports = {
  getClientIp,
};

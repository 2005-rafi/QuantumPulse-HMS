const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../core/config');

const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpires });

/**
 * Refresh tokens include a random jti (JWT ID) to ensure every issued token
 * is cryptographically unique, even if generated in the same second.
 * Without this, tokens generated in the same second share the same iat and
 * produce identical signatures — breaking rotation security.
 */
const signRefreshToken = (payload) =>
  jwt.sign(
    { ...payload, jti: crypto.randomBytes(16).toString('hex') },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires }
  );

const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwt.accessSecret);

const verifyRefreshToken = (token) =>
  jwt.verify(token, config.jwt.refreshSecret);

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };

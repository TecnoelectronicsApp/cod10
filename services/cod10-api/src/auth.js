const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function getSecret() {
  return process.env.JWT_SECRET || 'cod10-dev-secret';
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

function authContext(req) {
  if (!req) return null;

  const headers = req.headers || req.request?.headers;
  let header = '';

  if (headers && typeof headers.get === 'function') {
    header = headers.get('authorization') || headers.get('Authorization') || '';
  } else if (headers?.authorization) {
    header = headers.authorization;
  }

  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return verifyToken(token);
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authContext,
};

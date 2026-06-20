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

function normalizePhone(input) {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `58${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('4')) {
    digits = `58${digits}`;
  }
  return digits;
}

function phoneAuthEmail(phone) {
  return `${normalizePhone(phone)}@wa.cod10.app`;
}

async function comparePassword(password, hash) {
  if (!hash) return false;
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    return password === hash;
  }
  return bcrypt.compare(password, hash);
}

function authContext(req) {
  if (!req) return null;

  let header = '';

  const candidates = [req, req?.request, req?.req].filter(Boolean);
  for (const candidate of candidates) {
    const headers = candidate.headers;
    if (!headers) continue;
    if (typeof headers.get === 'function') {
      header = headers.get('authorization') || headers.get('Authorization') || '';
    } else if (headers.authorization) {
      header = headers.authorization;
    } else if (headers.Authorization) {
      header = headers.Authorization;
    }
    if (header) break;
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
  normalizePhone,
  phoneAuthEmail,
  authContext,
};

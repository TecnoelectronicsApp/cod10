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
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
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

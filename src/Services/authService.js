const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET not set');
}

async function verifyUser(username, password) {
  try {
    const user = await User.findByUsername(username);
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return null;
    
    return { id: user.id, username: user.username, role: user.role, name: user.name };
  } catch (err) {
    console.error('Auth error:', err.message);
    return null;
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: '8h' }
  );
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET);
    return await User.findById(decoded.id);
  } catch (err) {
    return null;
  }
}

module.exports = {
  verifyUser,
  generateToken,
  verifyToken
};
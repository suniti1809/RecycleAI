const jwt = require('jsonwebtoken');
const { User } = require('../models');
const SECRET = process.env.JWT_SECRET || 'super_secret_key';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    
    try {
      if (User && decoded.id) {
        const liveUser = await User.findByPk(decoded.id);
        if (liveUser) {
          req.user = { id: liveUser.id, role: liveUser.role, email: liveUser.email, name: liveUser.name };
          return next();
        }
      }
    } catch (e) {
      // Fallback to decoded payload if DB query fails
    }

    req.user = decoded;
    next();
  });
}

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
}

module.exports = { authenticateToken, generateToken, SECRET };

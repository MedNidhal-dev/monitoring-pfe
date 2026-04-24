const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET not set');
}

const authMiddleware = (req, res, next) => {
  // Skip auth for logstash
  if (req.path === '/ingest' || req.originalUrl.includes('/ingest')) {
    return next();
  }

  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Missing token' 
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT error:', err.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid session' 
    });
  }
};

module.exports = authMiddleware;
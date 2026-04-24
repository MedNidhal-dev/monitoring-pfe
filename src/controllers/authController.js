const authService = require('../services/authService');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[AUTH] Login attempt: ${username}`);

    const user = await authService.verifyUser(username, password);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = authService.generateToken(user);

    res.json({
      success: true,
      token,
      user
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ success: false, message: 'No token' });

    const token = header.split(' ')[1];
    const user = await authService.verifyToken(token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Session expired' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Session error' });
  }
};

exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};
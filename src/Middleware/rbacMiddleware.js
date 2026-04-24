const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC] Access denied for ${req.user.username} with role ${req.user.role}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied - insufficient privileges' 
      });
    }

    next();
  };
};

module.exports = checkRole;

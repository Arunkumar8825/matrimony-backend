const Admin = require('../models/Admin');

// Check if user has admin role
exports.isAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found'
      });
    }

    if (admin.role !== 'admin' && admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized as admin'
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Check if user has superadmin role
exports.isSuperAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found'
      });
    }

    if (admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized as super admin'
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Check admin permissions for specific module
exports.hasPermission = (module, actions = []) => {
  return async (req, res, next) => {
    try {
      const admin = await Admin.findById(req.admin.id);

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Admin not found'
        });
      }

      // Super admin has all permissions
      if (admin.role === 'superadmin') {
        return next();
      }

      // Check if admin has permission for the module
      const modulePermission = admin.permissions.find(p => p.module === module);
      
      if (!modulePermission) {
        return res.status(403).json({
          success: false,
          error: `No permission for module: ${module}`
        });
      }

      // Check if admin has required actions
      if (actions.length > 0) {
        const hasAllActions = actions.every(action => 
          modulePermission.actions.includes(action)
        );

        if (!hasAllActions) {
          return res.status(403).json({
            success: false,
            error: `Insufficient permissions for module: ${module}`
          });
        }
      }

      next();
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  };
};

// Audit log middleware for admin actions
exports.auditLog = (action) => {
  return async (req, res, next) => {
    try {
      // Store the original send function
      const originalSend = res.send;
      
      // Override send function to log after response
      res.send = function(data) {
        // Log admin action
        console.log(`[ADMIN AUDIT] ${new Date().toISOString()} - Admin: ${req.admin.email} - Action: ${action} - Path: ${req.path} - Method: ${req.method} - Status: ${res.statusCode}`);
        
        // Call original send
        originalSend.call(this, data);
      };

      next();
    } catch (err) {
      console.error('Audit log error:', err);
      next();
    }
  };
};

// Rate limiting for admin routes
exports.adminRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
};

// Validate admin input
exports.validateAdminInput = (req, res, next) => {
  // Trim and sanitize input
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
      
      // Prevent HTML/JS injection
      req.body[key] = req.body[key]
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
  }
  
  next();
};

// Check if admin account is locked
exports.checkAdminAccountLock = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (admin.accountLockedUntil && admin.accountLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((admin.accountLockedUntil - Date.now()) / (1000 * 60));
      
      return res.status(423).json({
        success: false,
        error: `Account is locked. Try again in ${minutesLeft} minutes.`
      });
    }

    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
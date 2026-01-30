const { validationResult } = require('express-validator');

// Validate request
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Sanitize input
exports.sanitizeInput = (req, res, next) => {
  // Trim strings
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  }
  next();
};

// Check object ownership
exports.checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Check if user owns the resource or is admin
      if (resource.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  };
};
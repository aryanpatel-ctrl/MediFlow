const { protect, optionalAuth, authorize, hospitalAccess, generateToken } = require('./auth');
const { AppError, asyncHandler, errorHandler, notFound } = require('./errorHandler');

module.exports = {
  // Auth middleware
  protect,
  optionalAuth,
  authorize,
  hospitalAccess,
  generateToken,
  // Error handling
  AppError,
  asyncHandler,
  errorHandler,
  notFound
};

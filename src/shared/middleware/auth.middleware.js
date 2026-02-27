// shared/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const { AppError } = require('./error.middleware');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Return 401 so the frontend interceptor knows to try /refresh
      return next(new AppError(401, 'Access token required'));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return next(new AppError(401, 'Invalid or expired access token'));
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    next(error);
  }
};
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Forbidden: Access denied'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
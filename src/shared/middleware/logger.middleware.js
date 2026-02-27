const { logger } = require('../utils/logger');

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.path} ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
  });

  next();
};

module.exports = { loggerMiddleware };

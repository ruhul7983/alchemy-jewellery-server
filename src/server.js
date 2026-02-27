const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { env } = require('./shared/config/env');
const { logger } = require('./shared/utils/logger');
const { loggerMiddleware } = require('./shared/middleware/logger.middleware');
const { errorHandler, notFoundHandler } = require('./shared/middleware/error.middleware');
const { createAuthRouter } = require('./modules/auth/auth.routes');
const { createUserRouter } = require('./modules/user/user.routes');
const cookieParser = require('cookie-parser');
const path = require('path');
const prisma = require('./lib/prisma');
const { createAdminAuthRouter } = require('./modules/auth/admin.auth.routes');
const { createMetalRouter } = require('./modules/metal/metal.routes');

const app = express();

// ✅ 1. Update Helmet Configuration
// We explicitly tell Helmet to allow cross-origin resource sharing for images/files
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ 2. CORS setup
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

// ✅ 3. Serve Static Files with manual header fallback (Extra Safety)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../public/uploads')));
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.server.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', createAuthRouter());
app.use('/api/user', createUserRouter());
app.use('/api/admin/auth', createAdminAuthRouter());
app.use("/api/metal", createMetalRouter());








app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('✓ Database connected successfully');

    app.listen(env.server.port, () => {
      logger.info(`✓ Server running on port ${env.server.port}`);
      logger.info(`✓ API URL: http://localhost:${env.server.port}`);
    });
  } catch (error) {
    logger.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  try {
    await prisma.$disconnect();
    logger.info('✓ Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('✗ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

start();
const express = require('express');
const { AdminAuthController } = require('./admin.auth.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');

const createAdminAuthRouter = () => {
  const router = express.Router();
  const controller = new AdminAuthController();

  // Public Routes (No Access Token needed)
  router.post('/login', controller.login);
  router.post('/verify-2fa', controller.verify2FA);
  router.post('/refresh', controller.refreshToken); 

  // Protected Routes (Access Token required)
  router.use(authenticate);
  router.use(authorize('ADMIN'));

  router.get('/profile', controller.getProfile);
  router.post('/logout', controller.logout);

  return router;
};

module.exports = { createAdminAuthRouter };
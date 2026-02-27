const express = require('express');
const { AuthController } = require('./auth.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { validateRequest, registerSchema, loginSchema } = require('./auth.validation');
const { upload } = require('../../shared/utils/upload');

const createAuthRouter = () => {
  const router = express.Router();
  const controller = new AuthController();

  // ==========================================
  // PUBLIC ROUTES (No Authentication Required)
  // ==========================================
  
  router.post('/register', 
    validateRequest(registerSchema), 
    controller.register
  );

  router.post('/login', 
    validateRequest(loginSchema), 
    controller.login
  );

  // ✅ OTP Routes (Public)
  router.post('/verify-otp', controller.verifyOTP);
  router.post('/resend-otp', controller.resendOTP);

  // ==========================================
  // PROTECTED ROUTES (Authentication Required)
  // ==========================================
  
  router.get('/profile', 
    authenticate, 
    controller.getProfile
  );

  router.patch('/profile', 
    authenticate, 
    upload.single('image'),
    controller.updateProfile
  );

  router.post('/logout', 
    authenticate, 
    controller.logout
  );

  return router;
};

module.exports = { createAuthRouter };
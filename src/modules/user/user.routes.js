const express = require('express');
const { UserController } = require('./user.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');

const createUserRouter = () => {
  const router = express.Router();
  const controller = new UserController();

  // 1. GLOBAL AUTHENTICATION
  // All routes below this line require a valid session cookie
  router.use(authenticate);

  // 2. ADDRESS MANAGEMENT (Specific Routes First)
  // These are available to all authenticated users
  router.get('/addresses', controller.getAddresses);
  router.post('/addresses', controller.addAddress);
  router.patch('/addresses/:id', controller.updateAddress);
  router.delete('/addresses/:id', controller.deleteAddress);

  // 3. ADMIN ONLY ROUTES (Dynamic Routes Last)
  // Move these to the bottom so they don't intercept /addresses
  router.get('/', authorize('ADMIN'), controller.getAllUsers);
  router.get('/:id', authorize('ADMIN'), controller.getUserById);
  router.put('/:id', authorize('ADMIN'), controller.updateUser);
  router.delete('/:id', authorize('ADMIN'), controller.deleteUser);

  return router;
};

module.exports = { createUserRouter };
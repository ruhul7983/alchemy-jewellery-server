const { UserService } = require('./user.service');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  getAllUsers = async (req, res, next) => {
    try {
      const users = await this.userService.getAllUsers();

      res.status(200).json({
        status: 'success',
        results: users.length,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await this.userService.updateUser(id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'User updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      await this.userService.deleteUser(id);

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };


  addAddress = async (req, res, next) => {
    try {
      const address = await this.userService.addAddress(req.user.userId, req.body);
      res.status(201).json({ status: "success", data: { address } });
    } catch (error) {
      next(error);
    }
  };

  getAddresses = async (req, res, next) => {
    try {
      const addresses = await this.userService.getMyAddresses(req.user.userId);
      res.status(200).json({ status: "success", data: { addresses } });
    } catch (error) {
      next(error);
    }
  };

  updateAddress = async (req, res, next) => {
    try {
      const address = await this.userService.updateAddress(req.user.userId, req.params.id, req.body);
      res.status(200).json({ status: "success", data: { address } });
    } catch (error) {
      next(error);
    }
  };

  deleteAddress = async (req, res, next) => {
    try {
      await this.userService.deleteAddress(req.user.userId, req.params.id);
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { UserController };

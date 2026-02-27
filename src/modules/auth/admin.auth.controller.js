// admin.auth.controller.js
const { AdminAuthService } = require('./admin.auth.service');

class AdminAuthController {
  constructor() {
    this.adminAuthService = new AdminAuthService();
  }

  login = async (req, res, next) => {
    try {
      const result = await this.adminAuthService.initiateAdminLogin(req.body);
      res.status(200).json({
        status: "pending_2fa",
        message: result.message,
        data: { userId: result.userId }
      });
    } catch (error) {
      next(error);
    }
  };

  verify2FA = async (req, res, next) => {
    try {
      const { userId, code } = req.body;
      const { user, accessToken, refreshToken } = await this.adminAuthService.verifyAdmin2FA(userId, code);

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      res.status(200).json({
        status: "success",
        data: { user, accessToken }
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req, res, next) => {
    try {
      const oldRefreshToken = req.cookies.refresh_token;
      const { accessToken, refreshToken } = await this.adminAuthService.refreshAccessToken(oldRefreshToken);

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({ status: "success", data: { accessToken } });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (refreshToken) {
        await this.adminAuthService.deleteSession(refreshToken);
      }
      res.clearCookie('refresh_token', { path: "/" });
      res.status(200).json({ status: 'success', message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req, res, next) => {
    try {
      const user = await this.adminAuthService.getAdminProfile(req.user.userId);
      res.status(200).json({ status: "success", data: { user } });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AdminAuthController };
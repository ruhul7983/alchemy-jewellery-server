const { AuthService } = require('./auth.service');
const { registerSchema, loginSchema } = require('./auth.validation');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await this.authService.register(validatedData);

    // Frontend sees 'pending_verification' and redirects
    res.status(201).json({
      status: result.status, 
      message: result.message,
      data: result.data, // Contains userId for redirect
    });
  } catch (error) {
    next(error);
  }
};

verifyOTP = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    const result = await this.authService.verifyOTP(userId, code);

    // CREATE SESSION IMMEDIATELY
    res.cookie("session_id", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      status: "success",
      message: "Account verified and logged in",
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req, res, next) => {
    try {
      const result = await this.authService.login(req.body);

      // ✅ Handle unverified user
      if (!result.isVerified) {
        return res.status(200).json({
          status: "pending_verification",
          message: result.message,
          data: { 
            userId: result.user.id,
            email: result.user.email,
            phone: result.user.phone,
            fullName: result.user.fullName
          }
        });
      }

      // ✅ Verified user - set session cookie
      res.cookie("session_id", result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({
        status: "success",
        message: "Login successful",
        data: { user: result.user },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify OTP
   * POST /api/auth/verify-otp
   * Body: { userId, code }
   */
  // verifyOTP = async (req, res, next) => {
  //   try {
  //     const { userId, code } = req.body;

  //     if (!userId || !code) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "userId and code are required"
  //       });
  //     }

  //     const result = await this.authService.verifyOTP(userId, code);

  //     // Set session cookie after successful verification
  //     res.cookie("session_id", result.sessionToken, {
  //       httpOnly: true,
  //       secure: process.env.NODE_ENV === "production",
  //       sameSite: "lax",
  //       maxAge: 7 * 24 * 60 * 60 * 1000,
  //       path: "/",
  //     });

  //     res.status(200).json({
  //       status: "success",
  //       message: "Account verified and logged in successfully",
  //       data: { user: result.user },
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  /**
   * Resend OTP
   * POST /api/auth/resend-otp
   * Body: { userId }
   */
  resendOTP = async (req, res, next) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          status: "error",
          message: "userId is required"
        });
      }

      const result = await this.authService.resendOTP(userId);
      
      res.status(200).json({ 
        status: "success", 
        message: result.message,
        data: {
          sentTo: result.sentTo
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = async (req, res, next) => {
    try {
      const sessionId = req.cookies.session_id;
      await this.authService.logout(sessionId);

      res.clearCookie('session_id');
      res.json({ 
        status: 'success', 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user profile
   * GET /api/auth/profile
   */
  getProfile = async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const user = await this.authService.getProfile(userId);

      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   * PATCH /api/auth/profile
   */
  updateProfile = async (req, res, next) => {
    try {
      const userId = req.user.userId;
      let updateData = { ...req.body };

      // Handle image upload
      if (req.file) {
        const host = req.get('host');
        updateData.imageUrl = `${req.protocol}://${host}/uploads/profiles/${req.file.filename}`;
      }

      const user = await this.authService.updateProfile(userId, updateData);

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AuthController };
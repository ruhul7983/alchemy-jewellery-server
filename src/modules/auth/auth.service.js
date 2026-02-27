const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../../lib/prisma");
const { AppError } = require("../../shared/middleware/error.middleware");
const fs = require('fs').promises;
const path = require('path');
const { sendSms } = require("../../shared/utils/sendSms");

class AuthService {
  // ==========================================
  // PRIVATE OTP METHODS
  // ==========================================

  /**
   * Generate OTP and store in verification table
   * @private
   */
  async _generateOTP({ userId, target, type = "SIGNUP", expiryMinutes = 5 }) {
    console.log('🔍 Generating OTP for:', { userId, target, type });

    // 1. Clean up old unused codes
    await prisma.verification.deleteMany({
      where: { userId, type, usedAt: null }
    });

    // 2. Generate 6-digit OTP
    const isDev = process.env.NODE_ENV === "development";
    const code = isDev
      ? "000000"
      : Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // 3. Save to Database
    await prisma.verification.create({
      data: { userId, code, target, type, expiresAt },
    });

    // 4. INTEGRATE SMS API HERE
    const smsMessage = `Your Trenzo verification code is: ${code}. Valid for 5 minutes.`;

    // Only send actual SMS if it's a real phone number and not in dev mode (optional)
    if (target.match(/^\d+$/)) {
      try {
        await sendSms(target, smsMessage);
      } catch (err) {
        // Log error but don't stop the registration process
        console.error("SMS sending failed, but OTP was generated in DB");
      }
    }

    if (isDev) {
      console.log(`[AUTH-DEV] ✅ OTP Generated: ${code}`);
    }

    return { code: isDev ? code : undefined, expiresAt };
  }

  /**
   * Validate OTP code
   * @private
   */
  async _validateOTP({ userId, code, type }) {
    console.log('🔍 Validating OTP:', { userId, code, type });

    const verification = await prisma.verification.findFirst({
      where: {
        userId,
        code,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new AppError(400, "Invalid or expired verification code");
    }

    // Mark as used
    await prisma.verification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    console.log('✅ OTP validated successfully');
    return verification;
  }

  /**
   * TODO: Send SMS (integrate later with Twilio/AWS SNS)
   * @private
   */
  async _sendSMS(phone, code) {
    // Placeholder for SMS integration
    console.log(`📱 [SMS] Would send to ${phone}: Your OTP is ${code}`);

    // Example with Twilio (uncomment when ready):
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    // await client.messages.create({
    //   body: `Your verification code is: ${code}`,
    //   from: process.env.TWILIO_PHONE,
    //   to: phone
    // });
  }

  // ==========================================
  // PUBLIC AUTH METHODS
  // ==========================================

  /**
   * Register new user and generate OTP
   */
  async register(data) {
    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.phone ? [{ phone: data.phone }] : [])
        ]
      },
    });

    if (existingUser) {
      const field = existingUser.email === data.email ? "Email" : "Phone number";
      throw new AppError(400, `${field} already exists`);
    }

    // Create user (unverified by default)
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        isVerified: false // Explicitly set to false
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isVerified: true
      }
    });

    // Generate OTP
    try {
      const target = user.phone || user.email;
      await this._generateOTP({
        userId: user.id,
        target,
        type: "SIGNUP",
      });

      return {
        status: "success",
        message: "Registration successful. Please verify your account.",
        data: {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          requiresVerification: true
        },
      };
    } catch (error) {
      console.error('❌ Failed to generate OTP:', error);

      // Still return success but with partial status
      return {
        status: "partial_success",
        message: "User created but failed to send verification code. Please request a new code.",
        data: {
          userId: user.id,
          requiresVerification: true
        },
      };
    }
  }

  /**
   * Login - handles both verified and unverified users
   */
  async login(data) {
    const { identifier, password } = data;

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError(401, "Invalid credentials");
    }

    // ✅ CHECK IF USER IS VERIFIED
    if (!user.isVerified) {
      console.log('⚠️ Unverified user login attempt:', user.id);

      // Auto-generate new OTP for unverified user
      try {
        const target = user.phone || user.email;
        await this._generateOTP({
          userId: user.id,
          target,
          type: "SIGNUP",
        });

        return {
          isVerified: false,
          message: "Account not verified. A new verification code has been sent.",
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName
          },
        };
      } catch (error) {
        console.error('❌ Failed to generate OTP on login:', error);

        return {
          isVerified: false,
          message: "Account not verified. Please request a verification code.",
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName
          },
        };
      }
    }

    // ✅ USER IS VERIFIED - Create session
    const sessionToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: { userId: user.id, token: sessionToken, expiresAt }
    });

    return {
      isVerified: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        imageUrl: user.imageUrl
      },
      sessionToken
    };
  }

  /**
   * Verify OTP and activate user account
   */
  async verifyOTP(userId, code) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, isVerified: true }
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.isVerified) {
      throw new AppError(400, "User is already verified");
    }

    // Validate OTP
    await this._validateOTP({ userId, code, type: "SIGNUP" });

    // Update user as verified
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        imageUrl: true
      }
    });

    // Create session after successful verification
    const sessionToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: { userId: user.id, token: sessionToken, expiresAt },
    });

    console.log('✅ User verified and logged in:', userId);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName, // Ensure this key matches your store
        role: updatedUser.role,
        imageUrl: updatedUser.imageUrl
      },
      sessionToken,
    };
  }

  /**
   * Resend OTP to user
   */
  async resendOTP(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, isVerified: true }
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.isVerified) {
      throw new AppError(400, "User is already verified");
    }

    const target = user.phone || user.email;
    await this._generateOTP({
      userId: user.id,
      target,
      type: "SIGNUP",
    });

    return {
      message: "Verification code resent successfully",
      sentTo: target
    };
  }

  /**
   * Logout user
   */
  async logout(token) {
    if (token) {
      await prisma.session.delete({ where: { token } }).catch(() => { });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        imageUrl: true,
        isVerified: true
      }
    });

    if (!user) throw new AppError(404, "User not found");
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const { fullName, imageUrl, currentPassword, newPassword } = updateData;
    const dataToUpdate = {};

    if (fullName) dataToUpdate.fullName = fullName;

    if (imageUrl) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { imageUrl: true }
      });

      if (user && user.imageUrl) {
        try {
          const filename = user.imageUrl.split('/').pop();
          const oldFilePath = path.join(process.cwd(), 'public', 'uploads', 'profiles', filename);

          await fs.access(oldFilePath);
          await fs.unlink(oldFilePath);
          console.log("✅ Old profile image deleted");
        } catch (err) {
          console.error("⚠️ Could not delete old image:", err.message);
        }
      }
      dataToUpdate.imageUrl = imageUrl;
    }

    if (newPassword) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        throw new AppError(401, "Current password incorrect");
      }
      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    return await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        imageUrl: true,
        role: true
      }
    });
  }
}

module.exports = { AuthService };
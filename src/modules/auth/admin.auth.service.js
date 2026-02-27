// admin.auth.service.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../../lib/prisma");
const { AppError } = require("../../shared/middleware/error.middleware");

class AdminAuthService {
  /**
   * Generates both Access and Refresh tokens
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    return { accessToken, refreshToken };
  }

  async initiateAdminLogin(data) {
    const { identifier, password } = data;
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });

    if (!user || !(await bcrypt.compare(password, user.password)) || user.role !== 'ADMIN') {
      throw new AppError(401, "Invalid admin credentials");
    }

    const code = process.env.NODE_ENV === "development" ? "999999" : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000);

    await prisma.verification.create({
      data: { userId: user.id, code, target: user.phone || user.email, type: "ADMIN_ACTION", expiresAt }
    });

    return { userId: user.id, message: "OTP sent" };
  }

async verifyAdmin2FA(userId, code) {
  // 1. Data Normalization: Ensure inputs are clean strings
  const cleanUserId = String(userId).trim();
  const cleanCode = String(code).trim();

  // 2. Find the verification record
  // We use a 30-second 'grace period' for expiresAt to account for server/DB clock drift
  const verification = await prisma.verification.findFirst({
    where: {
      userId: cleanUserId,
      code: cleanCode,
      type: "ADMIN_ACTION",
      usedAt: null,
      expiresAt: {
        gt: new Date(new Date().getTime() - 30000), // 30-second buffer
      },
    },
  });

  // 3. Robust Error Check
  if (!verification) {
    console.error(`Verification failed for user ${cleanUserId} with code ${cleanCode}`);
    throw new AppError(400, "Invalid or expired OTP code");
  }

  // 4. Mark the code as used immediately to prevent replay attacks
  await prisma.verification.update({
    where: { id: verification.id },
    data: { usedAt: new Date() },
  });

  // 5. Fetch User details
  const user = await prisma.user.findUnique({
    where: { id: cleanUserId },
  });

  if (!user) {
    throw new AppError(404, "Admin user no longer exists");
  }

  // 6. Generate JWT Tokens (Access & Refresh)
  const { accessToken, refreshToken } = this.generateTokens(user);

  // 7. Store the Refresh Token in the database
  // We set the DB expiry to match the cookie expiry (e.g., 7 days)
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: refreshToken,
      expiresAt: refreshTokenExpiry,
    },
  });

  // 8. Return structured data for the controller
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    accessToken,
    refreshToken,
  };
}

  async refreshAccessToken(oldRefreshToken) {
    if (!oldRefreshToken) throw new AppError(401, "Refresh token missing");

    const session = await prisma.session.findUnique({
      where: { refreshToken: oldRefreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.deleteSession(oldRefreshToken);
      throw new AppError(401, "Session expired");
    }

    // Rotate tokens (delete old, create new)
    await this.deleteSession(oldRefreshToken);
    const { accessToken, refreshToken } = this.generateTokens(session.user);

    await prisma.session.create({
      data: { 
        userId: session.user.id, 
        refreshToken, 
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      }
    });

    return { accessToken, refreshToken };
  }

  async getAdminProfile(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, imageUrl: true }
    });
  }

  async deleteSession(token) {
    return await prisma.session.deleteMany({ where: { refreshToken: token } });
  }
}

module.exports = { AdminAuthService };
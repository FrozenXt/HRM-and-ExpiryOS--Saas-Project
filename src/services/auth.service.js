const bcrypt = require("bcryptjs");

const User = require("../models/user.model");
const UserSession = require("../models/user-session.model");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

class AuthService {
  async login(email, password, ipAddress, userAgent) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new Error(`User account is ${user.status}`);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new Error("Invalid email or password");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await UserSession.create({
      userId: user._id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;

    await user.save();

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        status: user.status,
        mustResetPassword: user.mustResetPassword,
      },
      accessToken,
      refreshToken,
    };
  }

  // New: rotates the refresh token on every use, per the spec's "rotated on every use" rule.
  async refresh(oldRefreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await User.findById(payload.sub);
    if (!user || user.status !== "active") {
      throw new Error("User no longer active");
    }

    // Find the session this refresh token belongs to
    const sessions = await UserSession.find({
      userId: user._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    let matchedSession = null;
    for (const session of sessions) {
      if (await bcrypt.compare(oldRefreshToken, session.refreshTokenHash)) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new Error("Refresh token has been revoked or reused");
    }

    // Rotate: revoke the old session, issue a brand new pair
    matchedSession.revokedAt = new Date();
    await matchedSession.save();

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newHash = await bcrypt.hash(newRefreshToken, 10);

    await UserSession.create({
      userId: user._id,
      refreshTokenHash: newHash,
      ipAddress: matchedSession.ipAddress,
      userAgent: matchedSession.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // New: logout revokes the current session so the refresh token can't be reused
  async logout(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return; // already invalid, nothing to revoke
    }

    const sessions = await UserSession.find({
      userId: payload.sub,
      revokedAt: null,
    });
    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        session.revokedAt = new Date();
        await session.save();
        break;
      }
    }
  }
}

module.exports = new AuthService();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");
const UserSession = require("../models/user-session.model");
const employeeRepository = require("../repositories/employee.repository");
const deviceSessionRepository = require("../repositories/device-session.repository");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

// --- device detection helpers (best-effort, from the User-Agent) ----------
function detectDeviceType(userAgent = "") {
  return /Mobile|Android|iPhone|iPad/i.test(userAgent) ? "mobile" : "desktop";
}

function detectOs(userAgent = "") {
  if (/Windows NT 10/i.test(userAgent)) return "Windows 10/11";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iOS/i.test(userAgent)) return "iOS";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return null;
}

// Stable fallback when the client doesn't send its own deviceId. Based on
// the User-Agent only (IPs change), so two identical browsers on different
// machines share an id — apps should send a real deviceId to avoid that.
function fallbackDeviceId(userAgent = "") {
  return (
    "web-" +
    crypto
      .createHash("sha256")
      .update(userAgent || "unknown")
      .digest("hex")
      .slice(0, 32)
  );
}

class AuthService {
  /**
   * Starts a DeviceSession for the logged-in user's employee profile.
   * Returns its id, or null if the user has no employee profile (e.g. super
   * admin) or anything goes wrong — a monitoring failure must never block a
   * login.
   */
  async _startDeviceSession(user, ipAddress, userAgent, deviceInfo = {}) {
    try {
      if (!user.companyId) return null;
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) return null;

      const deviceId = deviceInfo.deviceId || fallbackDeviceId(userAgent);
      const now = new Date();

      // Same device logging in again without a logout: close the stale one.
      await deviceSessionRepository.closeOpenForDevice(
        employee._id,
        deviceId,
        now,
      );

      const session = await deviceSessionRepository.create({
        employeeId: employee._id,
        companyId: user.companyId,
        deviceId,
        deviceType: deviceInfo.deviceType || detectDeviceType(userAgent),
        os: deviceInfo.os || detectOs(userAgent),
        appVersion: deviceInfo.appVersion || null,
        sessionStart: now,
        ipAddress: ipAddress || null,
      });
      return session._id;
    } catch (err) {
      console.error("Failed to start device session:", err.message);
      return null;
    }
  }

  async _endDeviceSession(deviceSessionId) {
    if (!deviceSessionId) return;
    try {
      await deviceSessionRepository.closeById(deviceSessionId, new Date());
    } catch (err) {
      console.error("Failed to end device session:", err.message);
    }
  }

  // deviceInfo (optional): { deviceId, deviceType, os, appVersion } sent by
  // a mobile/desktop client. Browsers can omit it — it's derived from the UA.
  async login(email, password, ipAddress, userAgent, deviceInfo = {}) {
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

    const deviceSessionId = await this._startDeviceSession(
      user,
      ipAddress,
      userAgent,
      deviceInfo,
    );

    await UserSession.create({
      userId: user._id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      deviceSessionId, // requires the new field on UserSession — see notes
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
      deviceSessionId, // lets apps attach it to LocationTrace.sessionId
    };
  }

  // Rotates the refresh token on every use, per the spec's "rotated on every use" rule.
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
      // Same login, same device — a token refresh is not a new device session.
      deviceSessionId: matchedSession.deviceSessionId || null,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // Logout revokes the current session so the refresh token can't be reused,
  // and closes the device session that login opened.
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
        await this._endDeviceSession(session.deviceSessionId);
        break;
      }
    }
  }
}

module.exports = new AuthService();

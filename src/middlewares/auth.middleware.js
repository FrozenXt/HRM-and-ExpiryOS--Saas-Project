const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/user.model");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "Authorization token required" });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid authorization format" });
    }

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired, please log in again",
      });
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json({ success: false, message: "User account is not active" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired access token" });
  }
};

module.exports = authenticate;

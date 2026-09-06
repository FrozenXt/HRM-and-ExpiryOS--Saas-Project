const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      companyId: user.companyId ? user.companyId.toString() : null, // new
      tokenVersion: user.tokenVersion, // new — checked on every request
      type: "access",
    },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), type: "refresh" },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn },
  );
};

const verifyAccessToken = (token) => jwt.verify(token, jwtConfig.accessSecret);
const verifyRefreshToken = (token) =>
  jwt.verify(token, jwtConfig.refreshSecret);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};

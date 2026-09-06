const authService = require("../services/auth.service");

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(
        email,
        password,
        req.ip,
        req.get("user-agent"),
      );
      return res
        .status(200)
        .json({ success: true, message: "Login successful", data: result });
    } catch (error) {
      return res.status(401).json({ success: false, message: error.message });
    }
  }

  // New
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res
          .status(400)
          .json({ success: false, message: "refreshToken is required" });
      }
      const result = await authService.refresh(refreshToken);
      return res
        .status(200)
        .json({ success: true, message: "Token refreshed", data: result });
    } catch (error) {
      return res.status(401).json({ success: false, message: error.message });
    }
  }

  // New
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await authService.logout(refreshToken);
      return res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();

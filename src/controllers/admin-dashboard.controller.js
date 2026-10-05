const adminDashboardService = require("../services/admin-dashboard.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class AdminDashboardController {
  async show(req, res) {
    try {
      const dashboard = await adminDashboardService.getDashboard(req.user, {
        companyId: req.query.companyId,
      });
      return successResponse(res, "Dashboard fetched successfully", dashboard);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new AdminDashboardController();

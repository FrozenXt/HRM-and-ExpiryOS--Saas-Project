const staffDashboardService = require("../services/staff-dashboard.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class StaffDashboardController {
  async show(req, res) {
    try {
      const { employeeId, month, year } = req.query;
      const dashboard = await staffDashboardService.getDashboard(req.user, {
        employeeId,
        month,
        year,
      });
      return successResponse(res, "Dashboard fetched successfully", dashboard);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new StaffDashboardController();

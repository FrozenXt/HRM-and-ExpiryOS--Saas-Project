const monitoringPolicyService = require("../services/monitoring-policy.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class MonitoringPolicyController {
  async show(req, res) {
    try {
      const policy = await monitoringPolicyService.getPolicy(
        req.user,
        req.query.companyId,
      );
      return successResponse(
        res,
        "Monitoring policy fetched successfully",
        policy,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const policy = await monitoringPolicyService.updatePolicy(
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Monitoring policy updated successfully",
        policy,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new MonitoringPolicyController();

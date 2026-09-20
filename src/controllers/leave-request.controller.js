// controllers/leave-request.controller.js
const BaseTenantController = require("./base-tenant.controller");
const leaveRequestService = require("../services/leave-request.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class LeaveRequestController extends BaseTenantController {
  constructor() {
    super(leaveRequestService, "Leave request");
    this.setStatus = this.setStatus.bind(this);
  }

  async setStatus(req, res) {
    try {
      const record = await leaveRequestService.setStatus(
        req.params.id,
        req.body.approved,
        req.user,
      );
      return successResponse(res, "Leave request status updated", record);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new LeaveRequestController();

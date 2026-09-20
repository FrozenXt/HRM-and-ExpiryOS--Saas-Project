const BaseTenantController = require("./base-tenant.controller");
const timeLogService = require("../services/time-log.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class TimeLogController extends BaseTenantController {
  constructor() {
    super(timeLogService, "Time log");
    this.submit = this.submit.bind(this);
    this.review = this.review.bind(this);
  }

  async submit(req, res) {
    try {
      const log = await timeLogService.submit(req.params.id, req.user);
      return successResponse(res, "Time log submitted successfully", log);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async review(req, res) {
    try {
      const log = await timeLogService.review(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Time log reviewed successfully", log);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new TimeLogController();

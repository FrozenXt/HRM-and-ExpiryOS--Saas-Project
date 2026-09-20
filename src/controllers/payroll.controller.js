const BaseTenantController = require("./base-tenant.controller");
const payrollService = require("../services/payroll.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class PayrollController extends BaseTenantController {
  constructor() {
    super(payrollService, "Payroll");
    this.approve = this.approve.bind(this);
    this.release = this.release.bind(this);
  }

  async approve(req, res) {
    try {
      const doc = await payrollService.approve(req.params.id, req.user);
      return successResponse(res, "Payroll approved successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async release(req, res) {
    try {
      const doc = await payrollService.release(
        req.params.id,
        req.file,
        req.user,
      );
      return successResponse(res, "Payroll released successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new PayrollController();

const path = require("path");
const BaseTenantController = require("./base-tenant.controller");
const payrollService = require("../services/payroll.service");
const payslipService = require("../services/payslip.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class PayrollController extends BaseTenantController {
  constructor() {
    super(payrollService, "Payroll");
    this.approve = this.approve.bind(this);
    this.release = this.release.bind(this);
    this.bulkRelease = this.bulkRelease.bind(this);
    this.downloadPayslip = this.downloadPayslip.bind(this);
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

  async bulkRelease(req, res) {
    try {
      const { ids } = req.body;
      const result = await payrollService.bulkRelease(ids, req.user);
      return successResponse(res, "Bulk release completed", result);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async downloadPayslip(req, res) {
    try {
      const payroll = await payrollService.getById(req.params.id, req.user);

      if (payroll.status !== "released") {
        return errorResponse(
          res,
          "Payslip is only available once the payroll is released",
          400,
        );
      }
      if (!payroll.payslipUrl) {
        return errorResponse(
          res,
          "No payslip file found for this payroll",
          404,
        );
      }

      const filePath = path.join(__dirname, "..", "..", payroll.payslipUrl);
      const employeeSlug = await payslipService.getEmployeeSlug(
        payroll.employeeId,
      );
      return res.download(
        filePath,
        `${employeeSlug}-payslip-${payroll.period}.pdf`,
      );
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new PayrollController();

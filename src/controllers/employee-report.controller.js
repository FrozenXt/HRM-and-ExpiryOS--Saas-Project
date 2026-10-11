const service = require("../services/employee-report.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class EmployeeReportController {
  async summary(req, res) {
    try {
      return successResponse(
        res,
        "Employee report fetched",
        await service.getSummary(req.user, req.query),
      );
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 400);
    }
  }

  async directory(req, res) {
    try {
      return successResponse(
        res,
        "Employee directory fetched",
        await service.getDirectory(req.user, req.query),
      );
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 400);
    }
  }

  async exportExcel(req, res) {
    try {
      const { buffer, filename } = await service.exportExcel(
        req.user,
        req.query,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      return res.send(Buffer.from(buffer));
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 400);
    }
  }
}

module.exports = new EmployeeReportController();

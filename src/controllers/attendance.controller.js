// controllers/attendance.controller.js
const BaseTenantController = require("./base-tenant.controller");
const attendanceService = require("../services/attendance.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class AttendanceController extends BaseTenantController {
  constructor() {
    super(attendanceService, "Attendance");
    this.checkIn = this.checkIn.bind(this);
    this.checkOut = this.checkOut.bind(this);
  }

  async checkIn(req, res) {
    try {
      const record = await attendanceService.checkIn(
        req.user,
        req.body.location,
      );
      return successResponse(res, "Checked in successfully", record);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async checkOut(req, res) {
    try {
      const record = await attendanceService.checkOut(
        req.user,
        req.body.location,
      );
      return successResponse(res, "Checked out successfully", record);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new AttendanceController();

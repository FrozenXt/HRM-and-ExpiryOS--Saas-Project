// controllers/attendance.controller.js
const BaseTenantController = require("./base-tenant.controller");
const attendanceService = require("../services/attendance.service");
const { successResponse, errorResponse } = require("../utils/api-response");
const attendanceReportService = require("../services/attendance-report.service");
const { verifyUserPin } = require("../services/pin.service");

class AttendanceController extends BaseTenantController {
  constructor() {
    super(attendanceService, "Attendance");
    this.checkIn = this.checkIn.bind(this);
    this.checkOut = this.checkOut.bind(this);
    this.dayStatus = this.dayStatus.bind(this);
    this.exportReport = this.exportReport.bind(this);
    this.setPin = this.setPin.bind(this);
    this.mobileCheckIn = this.mobileCheckIn.bind(this);
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

  async dayStatus(req, res) {
    try {
      const status = await attendanceService.dayStatus(req.user);
      return successResponse(res, "Day status fetched", status);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // POST /attendance/pin  { employeeId, pin }
  // HR/Admin only. Sets or resets the 4-digit kiosk PIN for an employee.
  async setPin(req, res) {
    try {
      const { employeeId, pin } = req.body || {};
      if (!employeeId || !pin) {
        return errorResponse(res, "employeeId and pin are required", 400);
      }
      const result = await attendanceService.setEmployeePin(
        req.user,
        employeeId,
        pin,
      );
      return successResponse(res, "PIN set successfully", result);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // GET /attendance/export?year=2026&month=10   (omit month for a yearly report)
  async exportReport(req, res) {
    try {
      const { buffer, filename } = await attendanceReportService.build(
        req.user,
        {
          employeeId: req.query.employeeId,
          year: req.query.year,
          month: req.query.month,
        },
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
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async mobileCheckIn(req, res) {
    try {
      const { location, pin } = req.body || {};
      if (!location) {
        return errorResponse(res, "location is required", 400);
      }
      await verifyUserPin(req.user._id, pin);
      const record = await attendanceService.checkIn(req.user, location, {
        requireInsideGeofence: true,
      });
      return successResponse(res, "Checked in successfully", record);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new AttendanceController();

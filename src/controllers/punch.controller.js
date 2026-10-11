// controllers/punch.controller.js
const punchService = require("../services/punch.service");
const employeeRepository = require("../repositories/employee.repository");
const { successResponse, errorResponse } = require("../utils/api-response");

// Kiosk punches are unauthenticated (no JWT) — the employee identifies
// themselves with employeeId + PIN. This controller is therefore NOT a
// BaseTenantController: there is no req.user to scope from.
class PunchController {
  constructor() {
    this.punch = this.punch.bind(this);
    this.recent = this.recent.bind(this);
    this.employeeHistory = this.employeeHistory.bind(this);
  }

  // POST /api/v1/punch
  // Public. Body: { employeeId, pin, type: "in" | "out", deviceId?, location? }
  async punch(req, res) {
    try {
      const { employeeId, pin, type, deviceId, location } = req.body || {};

      if (!employeeId || !pin || !type) {
        return errorResponse(res, "employeeId, pin and type are required", 400);
      }

      const result = await punchService.punch({
        employeeId,
        pin,
        type,
        deviceId: deviceId || null,
        location: location || null,
      });

      const verb = type === "in" ? "Checked in" : "Checked out";
      return successResponse(res, `${verb} successfully`, result);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // GET /api/v1/punch/recent?limit=50
  // Authenticated — live board / audit view for admin & HR.
  async recent(req, res) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const since = req.query.since ? new Date(req.query.since) : null;

      const data = await punchService.recentPunches(req.user.companyId, {
        limit,
        since,
      });

      return successResponse(res, "Recent punches fetched", data);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // GET /api/v1/punch/employee/:employeeId?limit=100
  // Admin/HR can view any employee in their company.
  // Staff can view only their own — mirrors the _scopeFor(user) rule
  // already used in attendance.service.js.
  async employeeHistory(req, res) {
    try {
      if (req.user.role === "staff") {
        const ownEmployee = await employeeRepository.findByUserId(req.user._id);
        if (
          !ownEmployee ||
          String(ownEmployee._id) !== String(req.params.employeeId)
        ) {
          return errorResponse(
            res,
            "You can only view your own punch history",
            403,
          );
        }
      }

      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const since = req.query.since ? new Date(req.query.since) : null;

      const data = await punchService.employeeHistory(req.params.employeeId, {
        limit,
        since,
      });

      return successResponse(res, "Punch history fetched", data);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new PunchController();

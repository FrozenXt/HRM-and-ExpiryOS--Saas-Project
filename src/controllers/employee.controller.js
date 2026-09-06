const BaseTenantController = require("./base-tenant.controller");
const employeeService = require("../services/employee.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class EmployeeController extends BaseTenantController {
  constructor() {
    super(employeeService, "Employee");

    this.me = this.me.bind(this);
  }

  async me(req, res) {
    try {
      const employee = await employeeService.getMyProfile(req.user);

      return successResponse(
        res,
        "Employee profile fetched successfully",
        employee,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new EmployeeController();

const BaseTenantController = require("./base-tenant.controller");
const shiftService = require("../services/shift.service");

class ShiftController extends BaseTenantController {
  constructor() {
    super(shiftService, "Shift");
  }
}

module.exports = new ShiftController();

const BaseTenantService = require("./base-tenant.service");
const leaveTypeRepository = require("../repositories/leave-type.repository");

class LeaveTypeService extends BaseTenantService {
  constructor() {
    super(leaveTypeRepository, "Leave type not found", ["name"]);
  }
}

module.exports = new LeaveTypeService();

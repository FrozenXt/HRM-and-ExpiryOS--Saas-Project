const BaseTenantRepository = require("./base-tenant.repository");
const LeaveType = require("../models/leave-type.model");

class LeaveTypeRepository extends BaseTenantRepository {
  constructor() {
    super(LeaveType);
  }
}

module.exports = new LeaveTypeRepository();

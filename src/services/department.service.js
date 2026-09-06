const BaseTenantService = require("./base-tenant.service");
const departmentRepository = require("../repositories/department.repository");

class DepartmentService extends BaseTenantService {
  constructor() {
    super(departmentRepository, "Department not found", ["name"]);
  }
}

module.exports = new DepartmentService();

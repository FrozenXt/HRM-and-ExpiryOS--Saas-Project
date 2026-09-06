const BaseTenantRepository = require("./base-tenant.repository");
const Department = require("../models/department.model");

class DepartmentRepository extends BaseTenantRepository {
  constructor() {
    super(Department);
  }
}

module.exports = new DepartmentRepository();

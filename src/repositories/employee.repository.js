const BaseTenantRepository = require("./base-tenant.repository");
const Employee = require("../models/employee.model");

class EmployeeRepository extends BaseTenantRepository {
  constructor() {
    super(Employee);
  }

  async findByUserId(userId) {
    return await Employee.findOne({ userId });
  }
}

module.exports = new EmployeeRepository();

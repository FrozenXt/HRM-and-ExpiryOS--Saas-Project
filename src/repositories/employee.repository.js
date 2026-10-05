const BaseTenantRepository = require("./base-tenant.repository");
const Employee = require("../models/employee.model");
const { attachProfileImage } = require("../helpers/profile-image.helper");

class EmployeeRepository extends BaseTenantRepository {
  constructor() {
    super(Employee);
  }

  async findByUserId(userId) {
    return await Employee.findOne({ userId });
  }

  // Every employeeId belonging to one company — used to scope admin/hr
  // queries in modules (like leave balances) that filter by employeeId
  // rather than companyId directly.
  async findIdsByCompany(companyId) {
    const employees = await Employee.find({ companyId }).select("_id").lean();
    return employees.map((e) => e._id);
  }

  // Same result shape as the base class, with `profileImage` added per row.
  async findAll(...args) {
    const result = await super.findAll(...args);
    return { ...result, data: await attachProfileImage(result.data) };
  }
}

module.exports = new EmployeeRepository();

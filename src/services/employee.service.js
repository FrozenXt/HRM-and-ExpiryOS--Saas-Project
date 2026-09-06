const BaseTenantService = require("./base-tenant.service");
const TenantScope = require("../helpers/tenant-scope.helper");
const employeeRepository = require("../repositories/employee.repository");
const userRepository = require("../repositories/user.repository");
const departmentRepository = require("../repositories/department.repository");
const designationRepository = require("../repositories/designation.repository");

class EmployeeService extends BaseTenantService {
  constructor() {
    // No uniqueFields — the constraint here is "one Employee per User",
    // which is handled explicitly in create() since it isn't a simple
    // per-company-unique field.
    super(employeeRepository, "Employee not found");
  }

  async _assertBelongsToCompany(repository, id, companyId, fieldLabel) {
    const doc = await repository.findById(id);

    if (!doc || doc.companyId.toString() !== companyId.toString()) {
      throw new Error(`${fieldLabel} must belong to the same company`);
    }

    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const user = await userRepository.findById(data.userId);

    if (!user) {
      throw new Error("userId does not refer to an existing user");
    }

    if (!user.companyId || user.companyId.toString() !== companyId.toString()) {
      throw new Error("userId must belong to the same company");
    }

    const existingEmployee = await employeeRepository.findByUserId(data.userId);

    if (existingEmployee) {
      throw new Error("This user already has an employee profile");
    }

    await this._assertBelongsToCompany(
      departmentRepository,
      data.departmentId,
      companyId,
      "departmentId",
    );

    await this._assertBelongsToCompany(
      designationRepository,
      data.designationId,
      companyId,
      "designationId",
    );

    if (data.reportingManagerId) {
      await this._assertBelongsToCompany(
        employeeRepository,
        data.reportingManagerId,
        companyId,
        "reportingManagerId",
      );
    }

    return await employeeRepository.create({ ...data, companyId });
  }

  async update(id, data, actingUser) {
    const doc = await employeeRepository.findById(id);

    if (!doc) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, doc, this.notFoundMessage);

    // userId and companyId are fixed at creation — an Employee profile
    // doesn't get reassigned to a different User or Company via update.
    const { companyId, userId, ...safeData } = data;

    if (safeData.departmentId) {
      await this._assertBelongsToCompany(
        departmentRepository,
        safeData.departmentId,
        doc.companyId,
        "departmentId",
      );
    }

    if (safeData.designationId) {
      await this._assertBelongsToCompany(
        designationRepository,
        safeData.designationId,
        doc.companyId,
        "designationId",
      );
    }

    if (safeData.reportingManagerId) {
      if (safeData.reportingManagerId === id) {
        throw new Error("An employee cannot report to themselves");
      }

      await this._assertBelongsToCompany(
        employeeRepository,
        safeData.reportingManagerId,
        doc.companyId,
        "reportingManagerId",
      );
    }

    return await employeeRepository.update(id, safeData);
  }

  async getMyProfile(actingUser) {
    const employee = await employeeRepository.findByUserId(actingUser._id);

    if (!employee) {
      throw new Error("No employee profile found for this account");
    }

    return employee;
  }
}

module.exports = new EmployeeService();

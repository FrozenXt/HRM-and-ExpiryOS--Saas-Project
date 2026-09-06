const BaseTenantService = require("./base-tenant.service");
const TenantScope = require("../helpers/tenant-scope.helper");
const designationRepository = require("../repositories/designation.repository");
const departmentRepository = require("../repositories/department.repository");

class DesignationService extends BaseTenantService {
  constructor() {
    super(designationRepository, "Designation not found", ["name"]);
  }

  async _assertDepartmentBelongsToCompany(departmentId, companyId) {
    const department = await departmentRepository.findById(departmentId);

    if (
      !department ||
      department.companyId.toString() !== companyId.toString()
    ) {
      throw new Error("departmentId must belong to the same company");
    }
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    if (data.departmentId) {
      await this._assertDepartmentBelongsToCompany(
        data.departmentId,
        companyId,
      );
    }

    return await super.create(data, actingUser);
  }

  async update(id, data, actingUser) {
    if (data.departmentId) {
      const doc = await designationRepository.findById(id);
      if (!doc) throw new Error(this.notFoundMessage);

      await this._assertDepartmentBelongsToCompany(
        data.departmentId,
        doc.companyId,
      );
    }

    return await super.update(id, data, actingUser);
  }
}

module.exports = new DesignationService();

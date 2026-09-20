const salaryStructureRepository = require("../repositories/salary-structure.repository");
const employeeRepository = require("../repositories/employee.repository");
const currencyRepository = require("../repositories/currency.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class SalaryStructureService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  // Staff can view their own salary — nobody else's, even within the
  // same company. Admin/HR see the whole company.
  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await salaryStructureRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await salaryStructureRepository.findById(id);
    if (!doc) throw new Error("Salary structure not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Salary structure not found",
    );
    return doc;
  }

  _validateWageTypeFields({ wageType, hourlyRate, dailyRate }) {
    if (wageType === "hourly" && hourlyRate == null) {
      throw new Error("hourlyRate is required when wageType is hourly");
    }
    if (wageType === "daily" && dailyRate == null) {
      throw new Error("dailyRate is required when wageType is daily");
    }
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const employee = await employeeRepository.findById(data.employeeId);
    if (!employee || employee.companyId.toString() !== companyId.toString()) {
      throw new Error("employeeId must belong to the same company");
    }

    const existing = await salaryStructureRepository.findByEmployeeId(
      data.employeeId,
    );
    if (existing) {
      throw new Error(
        "This employee already has a salary structure — update it instead",
      );
    }

    const currency = await currencyRepository.findById(data.currencyId);
    if (!currency)
      throw new Error("currencyId does not refer to an existing currency");

    this._validateWageTypeFields(data);

    return await salaryStructureRepository.create({ ...data, companyId });
  }

  async update(id, data, actingUser) {
    const doc = await salaryStructureRepository.findById(id);
    if (!doc) throw new Error("Salary structure not found");
    TenantScope.assertAccess(actingUser, doc, "Salary structure not found");

    const { companyId, employeeId, ...safeData } = data;

    if (
      safeData.wageType ||
      safeData.hourlyRate !== undefined ||
      safeData.dailyRate !== undefined
    ) {
      this._validateWageTypeFields({
        wageType: safeData.wageType ?? doc.wageType,
        hourlyRate:
          safeData.hourlyRate !== undefined
            ? safeData.hourlyRate
            : doc.hourlyRate,
        dailyRate:
          safeData.dailyRate !== undefined ? safeData.dailyRate : doc.dailyRate,
      });
    }

    return await salaryStructureRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await salaryStructureRepository.findById(id);
    if (!doc) throw new Error("Salary structure not found");
    TenantScope.assertAccess(actingUser, doc, "Salary structure not found");
    await salaryStructureRepository.delete(id);
    return doc;
  }
}

module.exports = new SalaryStructureService();

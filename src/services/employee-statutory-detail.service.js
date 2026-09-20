const employeeStatutoryDetailRepository = require("../repositories/employee-statutory-detail.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { maskLastN, decrypt } = require("../utils/encryption");

// aadhaarNumber/bankAccountNumber are select:false at the schema level, so
// by default they never come back from find()/findById(). This mask() is a
// second layer for the one place we DO explicitly select them (getById),
// so the API response still never contains the real number — only Payroll
// generation (internal, via findDecryptedByEmployeeId) sees the real value.
function maskSensitive(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  if (obj.aadhaarNumber)
    obj.aadhaarNumber = maskLastN(decrypt(obj.aadhaarNumber));
  if (obj.bankAccountNumber)
    obj.bankAccountNumber = maskLastN(decrypt(obj.bankAccountNumber));
  return obj;
}

class EmployeeStatutoryDetailService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    // Default find() already excludes the select:false fields, so nothing
    // extra to mask here — list view intentionally omits them entirely.
    return await employeeStatutoryDetailRepository.findAll(
      searchHelper,
      scopeFilters,
    );
  }

  async getById(id, actingUser) {
    const EmployeeStatutoryDetail = require("../models/employee-statutory-detail.model");
    const doc = await EmployeeStatutoryDetail.findById(id).select(
      "+aadhaarNumber +bankAccountNumber",
    );
    if (!doc) throw new Error("Employee statutory detail not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Employee statutory detail not found",
    );

    return maskSensitive(doc);
  }

  async create(data, actingUser) {
    if (!data.bankAccountNumber)
      throw new Error("bankAccountNumber is required");
    if (!data.bankName) throw new Error("bankName is required");

    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const employee = await employeeRepository.findById(data.employeeId);
    if (!employee || employee.companyId.toString() !== companyId.toString()) {
      throw new Error("employeeId must belong to the same company");
    }

    const existing = await employeeStatutoryDetailRepository.findByEmployeeId(
      data.employeeId,
    );
    if (existing) {
      throw new Error(
        "This employee already has statutory details — update them instead",
      );
    }

    const created = await employeeStatutoryDetailRepository.create({
      ...data,
      companyId,
    });
    return maskSensitive(created);
  }

  async update(id, data, actingUser) {
    const doc = await employeeStatutoryDetailRepository.findById(id);
    if (!doc) throw new Error("Employee statutory detail not found");
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Employee statutory detail not found",
    );

    const { companyId, employeeId, ...safeData } = data;
    const updated = await employeeStatutoryDetailRepository.update(
      id,
      safeData,
    );
    return maskSensitive(updated);
  }

  async remove(id, actingUser) {
    const doc = await employeeStatutoryDetailRepository.findById(id);
    if (!doc) throw new Error("Employee statutory detail not found");
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Employee statutory detail not found",
    );
    await employeeStatutoryDetailRepository.delete(id);
    return doc;
  }
}

module.exports = new EmployeeStatutoryDetailService();

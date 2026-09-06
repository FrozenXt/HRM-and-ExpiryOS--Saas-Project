const documentRepository = require("../repositories/document.repository");
const employeeRepository = require("../repositories/employee.repository");
const documentTypeRepository = require("../repositories/document-type.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

// Fallback if a DocumentType has no configured reminder offsets.
const DEFAULT_WARN_DAYS = 30;

/**
 * A document is "expiring" once we've entered its DocumentType's largest
 * reminder window (e.g. offsets [90, 60, 30, 7, 0] -> expiring 90 days out),
 * "expired" once the date has actually passed, otherwise "valid".
 *
 * NOTE: this is computed once, at upload/re-upload time, and stored. It
 * will go stale as the calendar moves forward without anyone touching the
 * document — a scheduled sweep job (the natural home for writing
 * ExpiryReminderLog entries) should periodically recompute and update
 * `status` for documents nearing/at expiry. This API doesn't run that job.
 */
function computeStatus(expiryDate, warnDays) {
  const now = new Date();
  const expiry = new Date(expiryDate);

  if (expiry < now) {
    return "expired";
  }

  const warnThreshold = new Date(expiry);
  warnThreshold.setDate(warnThreshold.getDate() - warnDays);

  return now >= warnThreshold ? "expiring" : "valid";
}

class DocumentService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") {
      return null;
    }

    const employee = await employeeRepository.findByUserId(actingUser._id);

    if (!employee) {
      throw new Error("No employee profile found for this account");
    }

    return employee._id;
  }

  async _resolveWarnDays(documentTypeId) {
    const documentType = await documentTypeRepository.findById(documentTypeId);

    if (documentType?.defaultReminderOffsetsDays?.length) {
      return Math.max(...documentType.defaultReminderOffsetsDays);
    }

    return DEFAULT_WARN_DAYS;
  }

  async getDocuments(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );

    return await documentRepository.findAll(searchHelper, scopeFilters);
  }

  async getDocumentById(id, actingUser) {
    const doc = await documentRepository.findById(id);

    if (!doc) {
      throw new Error("Document not found");
    }

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Document not found",
    );

    return doc;
  }

  async uploadDocument(data, actingUser) {
    let employeeId = data.employeeId;

    if (actingUser.role === "staff") {
      employeeId = await this._getActingEmployeeId(actingUser);
    } else if (!employeeId) {
      throw new Error("employeeId is required");
    }

    const employee = await employeeRepository.findById(employeeId);

    if (!employee) {
      throw new Error("employeeId does not refer to an existing employee");
    }

    if (
      actingUser.role !== "super_admin" &&
      employee.companyId.toString() !== actingUser.companyId.toString()
    ) {
      throw new Error("employeeId must belong to your own company");
    }

    const documentType = await documentTypeRepository.findById(
      data.documentTypeId,
    );

    if (
      !documentType ||
      documentType.companyId.toString() !== employee.companyId.toString()
    ) {
      throw new Error("documentTypeId must belong to the same company");
    }

    const warnDays = await this._resolveWarnDays(data.documentTypeId);
    const status = computeStatus(data.expiryDate, warnDays);

    return await documentRepository.create({
      employeeId,
      companyId: employee.companyId,
      documentTypeId: data.documentTypeId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      expiryDate: data.expiryDate,
      uploadedBy: actingUser._id,
      status,
      version: 1,
      previousVersionId: null,
    });
  }

  async reuploadDocument(id, data, actingUser) {
    const previous = await documentRepository.findById(id);

    if (!previous) {
      throw new Error("Document not found");
    }

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      previous,
      employeeId,
      "Document not found",
    );

    const newExpiryDate = data.expiryDate ?? previous.expiryDate;
    const warnDays = await this._resolveWarnDays(previous.documentTypeId);
    const status = computeStatus(newExpiryDate, warnDays);

    return await documentRepository.create({
      employeeId: previous.employeeId,
      companyId: previous.companyId,
      documentTypeId: previous.documentTypeId,
      fileUrl: data.fileUrl ?? previous.fileUrl,
      fileName: data.fileName ?? previous.fileName,
      expiryDate: newExpiryDate,
      uploadedBy: actingUser._id,
      status,
      version: previous.version + 1,
      previousVersionId: previous._id,
    });
  }

  async deleteDocument(id, actingUser) {
    const doc = await documentRepository.findById(id);

    if (!doc) {
      throw new Error("Document not found");
    }

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Document not found",
    );

    await documentRepository.delete(id);

    return doc;
  }
}

module.exports = new DocumentService();

const fs = require("fs");
const path = require("path");
const screenshotRepository = require("../repositories/screenshot.repository");
const employeeRepository = require("../repositories/employee.repository");
const monitoringConsentService = require("./monitoring-consent.service");
const monitoringPolicyService = require("./monitoring-policy.service");
const TenantScope = require("../helpers/tenant-scope.helper");

const asBool = (v) => v === true || v === "true";

class ScreenshotService {
  async _getOwnEmployee(actingUser) {
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee;
  }

  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    return (await this._getOwnEmployee(actingUser))._id;
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await screenshotRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await screenshotRepository.findById(id);
    if (!doc) throw new Error("Screenshot not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Screenshot not found",
    );
    return doc;
  }

  // Uploaded by the employee's own device agent — recorded against the
  // caller's OWN employee profile, and only if consent has been given.
  // isFlagged is never client-settable; it's an admin/HR action (see flag()).
  async ingest(data, file, actingUser) {
    if (!file) throw new Error("file is required");

    const employee = await this._getOwnEmployee(actingUser);
    await monitoringPolicyService.assertFeatureEnabled(
      employee.companyId,
      "screenshotEnabled",
      "Screenshot capture",
    );
    await monitoringConsentService.assertConsentGiven(employee._id);

    if (!data.sessionId) throw new Error("sessionId is required");

    return await screenshotRepository.create({
      employeeId: employee._id,
      companyId: employee.companyId,
      sessionId: data.sessionId,
      capturedAt: data.capturedAt ?? new Date(),
      fileUrl: `/uploads/screenshots/${file.filename}`,
      isBlurred: asBool(data.isBlurred),
      isFlagged: false,
      activeAppName: data.activeAppName ?? null,
    });
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async flag(id, { isFlagged }, actingUser) {
    if (
      isFlagged !== true &&
      isFlagged !== false &&
      isFlagged !== "true" &&
      isFlagged !== "false"
    ) {
      throw new Error("isFlagged must be true or false");
    }

    const doc = await screenshotRepository.findById(id);
    if (!doc) throw new Error("Screenshot not found");
    TenantScope.assertAccess(actingUser, doc, "Screenshot not found");

    return await screenshotRepository.update(id, {
      isFlagged: asBool(isFlagged),
    });
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async remove(id, actingUser) {
    const doc = await screenshotRepository.findById(id);
    if (!doc) throw new Error("Screenshot not found");
    TenantScope.assertAccess(actingUser, doc, "Screenshot not found");

    await screenshotRepository.delete(id);

    // Don't leave the sensitive image orphaned on disk. Best-effort: the
    // record is already gone, so a failed unlink shouldn't fail the request.
    try {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        "screenshots",
        path.basename(doc.fileUrl),
      );
      await fs.promises.unlink(filePath);
    } catch (_) {
      // file already missing or unreadable — nothing more to do
    }

    return doc;
  }
}

module.exports = new ScreenshotService();

const assetAssignmentRepository = require("../repositories/asset-assignment.repository");
const assetRepository = require("../repositories/asset.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const User = require("../models/user.model");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

class AssetAssignmentService {
  // Employee: in-app + email. Admin/HR: in-app. Never throws, so a
  // notification problem can't make the assignment fail.
  async _notifyAssigned(asset, employee, assignment, actingUser) {
    try {
      const employeeUser = await User.findById(employee.userId)
        .select("firstName lastName")
        .lean();
      const name = fullName(employeeUser);
      const assetName = asset.name ? `"${asset.name}"` : "An asset";
      const companyId = assignment.companyId;

      if (String(employee.userId) !== String(actingUser._id)) {
        await notify({
          userId: employee.userId,
          companyId,
          type: "asset_assigned",
          title: "Asset assigned to you",
          message: `${assetName} has been assigned to you.`,
          link: "/assets",
          entityType: "AssetAssignment",
          entityId: assignment._id,
          email: { templateCode: "generic" },
        });
      }

      const adminIds = await adminHrIds(companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId,
        type: "asset_assigned",
        title: "Asset assigned",
        message: `${fullName(actingUser)} assigned ${assetName} to ${name}.`,
        link: "/assets",
        entityType: "AssetAssignment",
        entityId: assignment._id,
      });
    } catch (err) {
      console.error("[asset-assignment] notify failed:", err.message);
    }
  }

  // Employee: in-app. Admin/HR: in-app. Never throws.
  async _notifyReturned(doc, condition, actingUser) {
    try {
      const assetId = doc.assetId?._id || doc.assetId;
      const employeeId = doc.employeeId?._id || doc.employeeId;
      const [asset, employee] = await Promise.all([
        assetRepository.findById(assetId),
        employeeRepository.findById(employeeId),
      ]);
      if (!employee) return;

      const employeeUser = await User.findById(employee.userId)
        .select("firstName lastName")
        .lean();
      const name = fullName(employeeUser);
      const assetName = asset?.name ? `"${asset.name}"` : "An asset";
      const companyId = doc.companyId?._id || doc.companyId;
      const conditionNote =
        condition !== "good" ? ` Condition: ${condition}.` : "";

      if (String(employee.userId) !== String(actingUser._id)) {
        await notify({
          userId: employee.userId,
          companyId,
          type: "asset_returned",
          title: "Asset return recorded",
          message: `The return of ${assetName} has been recorded.`,
          link: "/assets",
          entityType: "AssetAssignment",
          entityId: doc._id,
        });
      }

      const adminIds = await adminHrIds(companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId,
        type: "asset_returned",
        title: "Asset returned",
        message: `${fullName(actingUser)} marked ${assetName} as returned by ${name}.${conditionNote}`,
        link: "/assets",
        entityType: "AssetAssignment",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[asset-assignment] notify failed:", err.message);
    }
  }

  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee) {
      const err = new Error("No employee profile found for this account");
      err.statusCode = 404;
      throw err;
    }
    return employee._id;
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await assetAssignmentRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    const doc = await assetAssignmentRepository.findById(id, scopeFilters);
    if (!doc) throw new Error("Asset assignment not found");
    return doc;
  }

  // Admin/HR/Super Admin only — enforced at the route layer. Assigns an
  // asset to an employee and flips the asset's status to "assigned".
  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const asset = await assetRepository.findById(data.assetId);
    if (!asset || asset.companyId.toString() !== companyId.toString()) {
      throw new Error("assetId must belong to the same company");
    }
    if (asset.status !== "available") {
      throw new Error(
        `Asset is not available (current status: ${asset.status})`,
      );
    }

    const employee = await employeeRepository.findById(data.employeeId);
    if (!employee || employee.companyId.toString() !== companyId.toString()) {
      throw new Error("employeeId must belong to the same company");
    }

    const activeAssignment =
      await assetAssignmentRepository.findActiveByAssetId(data.assetId);
    if (activeAssignment) {
      throw new Error(
        "This asset is already assigned to someone — return it first",
      );
    }

    const created = await assetAssignmentRepository.create({
      assetId: data.assetId,
      employeeId: data.employeeId,
      companyId,
      assignedDate: data.assignedDate || new Date(),
      assignedBy: actingUser._id,
    });

    await assetRepository.update(data.assetId, { status: "assigned" });

    await this._notifyAssigned(asset, employee, created, actingUser);

    return await assetAssignmentRepository.findById(created._id);
  }

  // Marks the assignment returned and puts the asset back to "available"
  // (or "under_repair" if the condition reported is damaged/lost).
  async returnAsset(id, data, actingUser) {
    const doc = await assetAssignmentRepository.findById(id);
    if (!doc) throw new Error("Asset assignment not found");
    TenantScope.assertAccess(actingUser, doc, "Asset assignment not found");

    if (doc.returnedDate) {
      throw new Error("This assignment has already been marked as returned");
    }

    const condition = data.condition || "good";
    const updated = await assetAssignmentRepository.update(id, {
      returnedDate: data.returnedDate || new Date(),
      condition,
    });

    const assetId = doc.assetId?._id || doc.assetId;
    await assetRepository.update(assetId, {
      status: condition === "good" ? "available" : "under_repair",
    });

    await this._notifyReturned(doc, condition, actingUser);

    return await assetAssignmentRepository.findById(updated._id);
  }

  async update(id, data, actingUser) {
    const doc = await assetAssignmentRepository.findById(id);
    if (!doc) throw new Error("Asset assignment not found");
    TenantScope.assertAccess(actingUser, doc, "Asset assignment not found");

    // Reassigning to a different asset/employee/company isn't supported via
    // plain update — that's a new assignment. Only assignedDate/condition
    // notes are editable here.
    const {
      assetId,
      employeeId,
      companyId,
      assignedBy,
      returnedDate,
      ...safeData
    } = data;
    const updated = await assetAssignmentRepository.update(id, safeData);
    return await assetAssignmentRepository.findById(updated._id);
  }

  async remove(id, actingUser) {
    const doc = await assetAssignmentRepository.findById(id);
    if (!doc) throw new Error("Asset assignment not found");
    TenantScope.assertAccess(actingUser, doc, "Asset assignment not found");

    await assetAssignmentRepository.delete(id);

    // Deleting an active (unreturned) assignment record should free the
    // asset back up, since there's no longer any record of it being held.
    if (!doc.returnedDate) {
      const assetId = doc.assetId?._id || doc.assetId;
      await assetRepository.update(assetId, { status: "available" });
    }

    return doc;
  }
}

module.exports = new AssetAssignmentService();

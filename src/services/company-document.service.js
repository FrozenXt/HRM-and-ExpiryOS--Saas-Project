const companyDocumentRepository = require("../repositories/company-document.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "Someone";

class CompanyDocumentService {
  // Active Super Admins (they review documents), minus anyone in `skip`.
  async _superAdminIds(skip = []) {
    const users = await User.find({ role: "super_admin", status: "active" })
      .select("_id")
      .lean();
    const skipSet = new Set(skip.map(String));
    return users.map((u) => String(u._id)).filter((id) => !skipSet.has(id));
  }

  // Super Admins (reviewers) + the company's Admin/HR: in-app.
  // Never throws, so a notification problem can't make the upload fail.
  async _notifyUploaded(doc, actingUser, resubmitted = false) {
    try {
      const companyId = doc.companyId?._id || doc.companyId;
      const company = await Company.findById(companyId)
        .select("legalName tradeName")
        .lean();
      const companyName =
        company?.tradeName || company?.legalName || "a company";
      const docName = doc.fileName ? `"${doc.fileName}"` : "a document";
      const verb = resubmitted ? "re-uploaded" : "uploaded";

      const superIds = await this._superAdminIds([actingUser._id]);
      await notifyBulk(superIds, {
        companyId,
        type: "company_document_submitted",
        title: "Document awaiting review",
        message: `${fullName(actingUser)} (${companyName}) ${verb} ${docName} for review.`,
        link: "/company-documents",
        entityType: "CompanyDocument",
        entityId: doc._id,
      });

      const adminIds = await adminHrIds(companyId, [
        actingUser._id,
        ...superIds,
      ]);
      await notifyBulk(adminIds, {
        companyId,
        type: "company_document_submitted",
        title: `Document ${verb}`,
        message: `${fullName(actingUser)} ${verb} ${docName}. It is pending review.`,
        link: "/company-documents",
        entityType: "CompanyDocument",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[company-document] notify failed:", err.message);
    }
  }

  // Uploader: in-app + email. Company Admin/HR: in-app. Never throws.
  async _notifyReviewed(doc, status, rejectionReason, actingUser) {
    try {
      const companyId = doc.companyId?._id || doc.companyId;
      const uploaderId = doc.uploadedBy?._id || doc.uploadedBy;
      const docName = doc.fileName ? `"${doc.fileName}"` : "Your document";
      const reason =
        status === "rejected" && rejectionReason
          ? ` Reason: ${rejectionReason}`
          : "";

      if (uploaderId && String(uploaderId) !== String(actingUser._id)) {
        await notify({
          userId: uploaderId,
          companyId,
          type: "company_document_reviewed",
          title: `Document ${status}`,
          message: `${docName} was ${status}.${reason}`,
          link: "/company-documents",
          entityType: "CompanyDocument",
          entityId: doc._id,
          email: { templateCode: "generic" },
        });
      }

      const adminIds = await adminHrIds(
        companyId,
        [actingUser._id, uploaderId].filter(Boolean),
      );
      await notifyBulk(adminIds, {
        companyId,
        type: "company_document_reviewed",
        title: `Document ${status}`,
        message: `${doc.fileName ? `"${doc.fileName}"` : "A document"} was ${status}.${reason}`,
        link: "/company-documents",
        entityType: "CompanyDocument",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[company-document] notify failed:", err.message);
    }
  }

  async getDocuments(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);

    return await companyDocumentRepository.findAll(searchHelper, scopeFilters);
  }

  async getDocumentById(id, actingUser) {
    const doc = await companyDocumentRepository.findById(id);

    if (!doc) {
      throw new Error("Company document not found");
    }

    TenantScope.assertAccess(actingUser, doc, "Company document not found");

    return doc;
  }

  async uploadDocument(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const created = await companyDocumentRepository.create({
      type: data.type,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      companyId,
      uploadedBy: actingUser._id,
      status: "pending_review",
      version: 1,
    });

    await this._notifyUploaded(created, actingUser);

    return created;
  }

  async updateDocument(id, data, actingUser) {
    const doc = await companyDocumentRepository.findById(id);

    if (!doc) {
      throw new Error("Company document not found");
    }

    TenantScope.assertAccess(actingUser, doc, "Company document not found");

    if (doc.status === "approved") {
      throw new Error(
        "An approved document cannot be modified — upload a new one instead",
      );
    }

    // Any re-upload resets it back to pending_review and clears the old
    // review decision — it needs to be looked at again.
    const updated = await companyDocumentRepository.update(id, {
      fileUrl: data.fileUrl ?? doc.fileUrl,
      fileName: data.fileName ?? doc.fileName,
      mimeType: data.mimeType ?? doc.mimeType,
      sizeBytes: data.sizeBytes ?? doc.sizeBytes,
      status: "pending_review",
      version: doc.version + 1,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });

    await this._notifyUploaded(updated || doc, actingUser, true);

    return updated;
  }

  async deleteDocument(id, actingUser) {
    const doc = await companyDocumentRepository.findById(id);

    if (!doc) {
      throw new Error("Company document not found");
    }

    TenantScope.assertAccess(actingUser, doc, "Company document not found");

    await companyDocumentRepository.delete(id);

    return doc;
  }

  // Super Admin only — enforced at the route layer, not re-checked here.
  async reviewDocument(id, { status, rejectionReason }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error('status must be either "approved" or "rejected"');
    }

    if (status === "rejected" && !rejectionReason) {
      throw new Error("rejectionReason is required when rejecting a document");
    }

    const doc = await companyDocumentRepository.update(id, {
      status,
      rejectionReason: status === "rejected" ? rejectionReason : null,
      reviewedBy: actingUser._id,
      reviewedAt: new Date(),
    });

    if (!doc) {
      throw new Error("Company document not found");
    }

    await this._notifyReviewed(doc, status, rejectionReason, actingUser);

    return doc;
  }
}

module.exports = new CompanyDocumentService();

const companyDocumentRepository = require("../repositories/company-document.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class CompanyDocumentService {
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

    return await companyDocumentRepository.create({
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
    return await companyDocumentRepository.update(id, {
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

    return doc;
  }
}

module.exports = new CompanyDocumentService();

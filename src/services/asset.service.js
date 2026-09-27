const assetRepository = require("../repositories/asset.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class AssetService {
  // Asset inventory management is admin/hr/super_admin only — enforced at
  // the route layer. Staff never list/manage assets directly; they see
  // what's assigned to them via AssetAssignment instead.
  async getAll(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);
    return await assetRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);
    const doc = await assetRepository.findById(id, scopeFilters);
    if (!doc) throw new Error("Asset not found");
    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const existing = await assetRepository.findByAssetTag(
      companyId,
      data.assetTag,
    );
    if (existing) {
      throw new Error("An asset with this tag already exists in this company");
    }

    return await assetRepository.create({
      ...data,
      companyId,
      status: data.status || "available",
    });
  }

  async update(id, data, actingUser) {
    const doc = await assetRepository.findById(id);
    if (!doc) throw new Error("Asset not found");
    TenantScope.assertAccess(actingUser, doc, "Asset not found");

    // companyId is fixed at creation — an asset doesn't move between companies.
    const { companyId, ...safeData } = data;
    return await assetRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await assetRepository.findById(id);
    if (!doc) throw new Error("Asset not found");
    TenantScope.assertAccess(actingUser, doc, "Asset not found");

    if (doc.currentAssignment) {
      throw new Error(
        "This asset is currently assigned — return it before deleting",
      );
    }

    await assetRepository.delete(id);
    return doc;
  }
}

module.exports = new AssetService();

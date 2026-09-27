const offerRepository = require("../repositories/offer.repository");
const { generateOfferLetter } = require("./offer-letter.service");
const TenantScope = require("../helpers/tenant-scope.helper");

class OfferService {
  async getAll(searchHelper, actingUser) {
    const query = this._buildFilter(searchHelper, actingUser);
    const skip = (searchHelper.getPage() - 1) * searchHelper.getLimit();
    const limit = searchHelper.getLimit();
    const sort = this._buildSort(searchHelper);

    return offerRepository.findMany(query, { skip, limit, sort });
  }

  async getById(id, actingUser) {
    const doc = await offerRepository.findById(id);
    if (!doc) {
      throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
    }
    TenantScope.assertSameCompany(actingUser, doc.companyId);
    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);
    return offerRepository.create({
      ...data,
      companyId,
      issuedBy: actingUser._id,
      issuedAt: new Date(),
    });
  }

  async update(id, data, actingUser) {
    const existing = await offerRepository.findById(id);
    if (!existing) {
      throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
    }
    TenantScope.assertSameCompany(actingUser, existing.companyId);

    delete data.companyId;
    delete data.issuedBy;
    delete data.issuedAt;

    return offerRepository.updateById(id, data);
  }

  async remove(id, actingUser) {
    const existing = await offerRepository.findById(id);
    if (!existing) {
      throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
    }
    TenantScope.assertSameCompany(actingUser, existing.companyId);
    await offerRepository.deleteById(id);
  }

  /* --------- Custom action: generate the PDF and attach it --------- */
  async generateLetter(id, actingUser) {
    const offer = await offerRepository.findById(id);
    if (!offer) {
      throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
    }
    TenantScope.assertSameCompany(actingUser, offer.companyId);

    const url = await generateOfferLetter(offer);
    return offerRepository.setOfferLetter(id, url);
  }

  /* ------------------------- private --------------------------- */

  _buildFilter(searchHelper, actingUser) {
    const query = {};

    if (actingUser.role !== "super_admin") {
      query.companyId = TenantScope.resolveCompanyId(actingUser);
    } else if (searchHelper.get("companyId")) {
      query.companyId = searchHelper.get("companyId");
    }

    const candidateId = searchHelper.get("candidateId");
    if (candidateId) query.candidateId = candidateId;

    const status = searchHelper.get("status");
    if (status) query.status = status;

    const designationId = searchHelper.get("designationId");
    if (designationId) query.designationId = designationId;

    const from = searchHelper.get("issuedFrom");
    const to = searchHelper.get("issuedTo");
    if (from || to) {
      query.issuedAt = {};
      if (from) query.issuedAt.$gte = new Date(from);
      if (to) query.issuedAt.$lte = new Date(to);
    }

    const joiningFrom = searchHelper.get("joiningFrom");
    const joiningTo = searchHelper.get("joiningTo");
    if (joiningFrom || joiningTo) {
      query.joiningDate = {};
      if (joiningFrom) query.joiningDate.$gte = new Date(joiningFrom);
      if (joiningTo) query.joiningDate.$lte = new Date(joiningTo);
    }

    const search = searchHelper.get("search") || searchHelper.get("q");
    if (search) {
      const rx = new RegExp(search, "i");
      query.$or = [{ status: rx }];
      // For text search over candidate name you'd need a lookup —
      // add later if the UI needs it.
    }

    return query;
  }

  _buildSort(searchHelper) {
    const field = searchHelper.get("sort_field") || "issuedAt";
    const dir =
      (searchHelper.get("sort") || "DESC").toUpperCase() === "ASC" ? 1 : -1;
    return { [field]: dir };
  }
}

module.exports = new OfferService();

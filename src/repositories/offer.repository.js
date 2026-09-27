const Offer = require("../models/offer.model");

const POPULATE = [
  { path: "candidateId", select: "firstName lastName email phone status" },
  {
    path: "companyId",
    select: "legalName tradeName logoUrl addressLine1 city country",
  },
  { path: "designationId", select: "name level" },
  { path: "issuedBy", select: "firstName lastName email role" },
];

class OfferRepository {
  get populate() {
    return POPULATE;
  }

  async create(data) {
    return Offer.create(data);
  }

  async findById(id) {
    return Offer.findById(id).populate(POPULATE).lean();
  }

  async findMany(
    query,
    { skip = 0, limit = 20, sort = { issuedAt: -1 } } = {},
  ) {
    const [data, total] = await Promise.all([
      Offer.find(query)
        .populate(POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Offer.countDocuments(query),
    ]);
    return { data, total };
  }

  async updateById(id, updates) {
    return Offer.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate(POPULATE)
      .lean();
  }

  async setOfferLetter(id, url) {
    return Offer.findByIdAndUpdate(id, { offerLetterUrl: url }, { new: true })
      .populate(POPULATE)
      .lean();
  }

  async deleteById(id) {
    return Offer.findByIdAndDelete(id).lean();
  }
}

module.exports = new OfferRepository();

const Announcement = require("../models/announcement.model");

const POPULATE = [
  { path: "companyId", select: "legalName tradeName logoUrl" },
  { path: "departmentId", select: "name" },
  { path: "postedBy", select: "firstName lastName email role" },
];

class AnnouncementRepository {
  get populate() {
    return POPULATE;
  }

  async create(data) {
    return Announcement.create(data);
  }

  async findById(id) {
    return Announcement.findById(id).populate(POPULATE).lean();
  }

  async findMany(
    query,
    { skip = 0, limit = 20, sort = { publishedAt: -1 } } = {},
  ) {
    const [data, total] = await Promise.all([
      Announcement.find(query)
        .populate(POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(query),
    ]);
    return { data, total };
  }

  async updateById(id, updates) {
    return Announcement.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate(POPULATE)
      .lean();
  }

  async deleteById(id) {
    return Announcement.findByIdAndDelete(id).lean();
  }
}

module.exports = new AnnouncementRepository();

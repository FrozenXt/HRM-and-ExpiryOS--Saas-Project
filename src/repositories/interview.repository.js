const Interview = require("../models/interview.model");

const POPULATE = [
  { path: "candidateId", select: "firstName lastName email phone status" },
  { path: "companyId", select: "legalName tradeName logoUrl" },
  { path: "interviewerIds", select: "firstName lastName email role" },
];

class InterviewRepository {
  get populate() {
    return POPULATE;
  }

  async create(data) {
    return Interview.create(data);
  }

  async findById(id) {
    return Interview.findById(id).populate(POPULATE).lean();
  }

  async findMany(
    query,
    { skip = 0, limit = 20, sort = { scheduledAt: -1 } } = {},
  ) {
    const [data, total] = await Promise.all([
      Interview.find(query)
        .populate(POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Interview.countDocuments(query),
    ]);
    return { data, total };
  }

  async updateById(id, updates) {
    return Interview.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate(POPULATE)
      .lean();
  }

  async deleteById(id) {
    return Interview.findByIdAndDelete(id).lean();
  }
}

module.exports = new InterviewRepository();

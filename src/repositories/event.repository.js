const Event = require("../models/event.model");

const POPULATE = [
  { path: "companyId", select: "legalName tradeName logoUrl" },
  {
    path: "employeeId",
    select: "id_int userId departmentId designationId",
    populate: [
      { path: "userId", select: "firstName lastName email role" },
      { path: "departmentId", select: "name" },
      { path: "designationId", select: "name" },
    ],
  },
  { path: "createdBy", select: "firstName lastName email role" },
];

class EventRepository {
  get populate() {
    return POPULATE;
  }

  async create(data) {
    return Event.create(data);
  }

  async findById(id) {
    return Event.findById(id).populate(POPULATE).lean();
  }

  async findMany(query, { skip = 0, limit = 20, sort = { date: 1 } } = {}) {
    const [data, total] = await Promise.all([
      Event.find(query)
        .populate(POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);
    return { data, total };
  }

  async updateById(id, updates) {
    return Event.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate(POPULATE)
      .lean();
  }

  async deleteById(id) {
    return Event.findByIdAndDelete(id).lean();
  }
}

module.exports = new EventRepository();

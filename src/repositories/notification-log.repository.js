const NotificationLog = require("../models/notification-log.model");

const USER_POPULATE = {
  path: "userId",
  select: "firstName lastName email role companyId",
  populate: { path: "companyId", select: "legalName tradeName" },
};

class NotificationLogRepository {
  // scopeFilter may include { userId } (single user, e.g. staff) or
  // { userId: { $in: [...] } } (a company's users, resolved by the service
  // since NotificationLog itself has no companyId field to filter on).
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      NotificationLog.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(USER_POPULATE)
        .lean(),
      NotificationLog.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await NotificationLog.findOne({ _id: id, ...scopeFilter }).populate(
      USER_POPULATE,
    );
  }

  async create(data) {
    return await NotificationLog.create(data);
  }

  async delete(id, scopeFilter) {
    return await NotificationLog.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new NotificationLogRepository();

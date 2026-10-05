const SavedReportView = require("../models/saved-report-view.model");

const USER_POPULATE = {
  path: "userId",
  select: "firstName lastName email role",
};
const COMPANY_POPULATE = { path: "companyId", select: "legalName tradeName" };

class SavedReportViewRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      SavedReportView.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(USER_POPULATE)
        .populate(COMPANY_POPULATE)
        .lean(),
      SavedReportView.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await SavedReportView.findOne({ _id: id, ...scopeFilter })
      .populate(USER_POPULATE)
      .populate(COMPANY_POPULATE);
  }

  async create(data) {
    return await SavedReportView.create(data);
  }

  async update(id, scopeFilter, data) {
    return await SavedReportView.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      { new: true, runValidators: true },
    )
      .populate(USER_POPULATE)
      .populate(COMPANY_POPULATE);
  }

  async delete(id, scopeFilter) {
    return await SavedReportView.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new SavedReportViewRepository();

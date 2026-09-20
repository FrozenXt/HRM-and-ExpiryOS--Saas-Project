const StatutoryRule = require("../models/statutory-rule.model");

class StatutoryRuleRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();
    const [data, total] = await Promise.all([
      StatutoryRule.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      StatutoryRule.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await StatutoryRule.findById(id);
  }
  // Used to warn about overlapping active rules for the same country+type.
  async findActiveOverlap(country, type, excludeId = null) {
    const query = { country, type, isActive: true };
    if (excludeId) query._id = { $ne: excludeId };
    return await StatutoryRule.findOne(query);
  }
  async create(data) {
    return await StatutoryRule.create(data);
  }
  async update(id, data) {
    return await StatutoryRule.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await StatutoryRule.findByIdAndDelete(id);
  }
}

module.exports = new StatutoryRuleRepository();

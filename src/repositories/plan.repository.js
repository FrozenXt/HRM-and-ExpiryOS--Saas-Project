const Plan = require("../models/plan.model");

class PlanRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();

    const [data, total] = await Promise.all([
      Plan.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),

      Plan.countDocuments(filters),
    ]);

    return {
      data,
      total,
    };
  }

  async findById(id) {
    return await Plan.findById(id);
  }

  async findByName(name) {
    return await Plan.findOne({ name });
  }

  async create(data) {
    return await Plan.create(data);
  }

  async update(id, data) {
    return await Plan.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await Plan.findByIdAndDelete(id);
  }
}

module.exports = new PlanRepository();

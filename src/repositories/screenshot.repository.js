const Screenshot = require("../models/screenshot.model");

class ScreenshotRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      Screenshot.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Screenshot.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await Screenshot.findById(id);
  }
  async create(data) {
    return await Screenshot.create(data);
  }
  async update(id, data) {
    return await Screenshot.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await Screenshot.findByIdAndDelete(id);
  }
}

module.exports = new ScreenshotRepository();

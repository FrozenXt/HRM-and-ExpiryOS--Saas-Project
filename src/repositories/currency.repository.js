const Currency = require("../models/currency.model");

class CurrencyRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();
    const [data, total] = await Promise.all([
      Currency.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Currency.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await Currency.findById(id);
  }
  async findByCode(code) {
    return await Currency.findOne({ code });
  }
  async create(data) {
    return await Currency.create(data);
  }
  async update(id, data) {
    return await Currency.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await Currency.findByIdAndDelete(id);
  }
}

module.exports = new CurrencyRepository();

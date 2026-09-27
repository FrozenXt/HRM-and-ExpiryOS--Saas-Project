const Receipt = require("../models/receipt.model");

class ReceiptRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      Receipt.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Receipt.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await Receipt.findById(id);
  }
  async create(data) {
    return await Receipt.create(data);
  }
  async delete(id) {
    return await Receipt.findByIdAndDelete(id);
  }
}

module.exports = new ReceiptRepository();

const RegularizationRequest = require("../models/regularization-request.model");

class RegularizationRequestRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      RegularizationRequest.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      RegularizationRequest.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await RegularizationRequest.findById(id);
  }
  async create(data) {
    return await RegularizationRequest.create(data);
  }
  async update(id, data) {
    return await RegularizationRequest.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
}

module.exports = new RegularizationRequestRepository();

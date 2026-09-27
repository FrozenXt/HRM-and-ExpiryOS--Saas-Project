const Candidate = require("../models/candidate.model");

class CandidateRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      Candidate.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Candidate.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await Candidate.findById(id);
  }
  async create(data) {
    return await Candidate.create(data);
  }
  async update(id, data) {
    return await Candidate.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await Candidate.findByIdAndDelete(id);
  }
}

module.exports = new CandidateRepository();

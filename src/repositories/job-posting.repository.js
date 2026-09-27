const JobPosting = require("../models/job-posting.model");

class JobPostingRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      JobPosting.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      JobPosting.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await JobPosting.findById(id);
  }
  async create(data) {
    return await JobPosting.create(data);
  }
  async update(id, data) {
    return await JobPosting.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await JobPosting.findByIdAndDelete(id);
  }
}

module.exports = new JobPostingRepository();

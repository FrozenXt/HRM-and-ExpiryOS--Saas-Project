const CompanyDocument = require("../models/company-document.model");

class CompanyDocumentRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };

    const [data, total] = await Promise.all([
      CompanyDocument.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),

      CompanyDocument.countDocuments(filters),
    ]);

    return {
      data,
      total,
    };
  }

  async findById(id) {
    return await CompanyDocument.findById(id);
  }

  async create(data) {
    return await CompanyDocument.create(data);
  }

  async update(id, data) {
    return await CompanyDocument.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await CompanyDocument.findByIdAndDelete(id);
  }
}

module.exports = new CompanyDocumentRepository();

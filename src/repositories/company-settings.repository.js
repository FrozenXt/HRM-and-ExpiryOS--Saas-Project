const CompanySettings = require("../models/company-settings.model");

class CompanySettingsRepository {
  async findByCompanyId(companyId) {
    return await CompanySettings.findOne({ companyId }).populate(
      "companyId",
      "legalName tradeName logoUrl",
    );
  }

  async create(data) {
    return await CompanySettings.create(data);
  }

  async updateBySet(id, setOps) {
    return await CompanySettings.findByIdAndUpdate(
      id,
      { $set: setOps },
      { new: true, runValidators: true },
    ).populate("companyId", "legalName tradeName logoUrl");
  }
}

module.exports = new CompanySettingsRepository();

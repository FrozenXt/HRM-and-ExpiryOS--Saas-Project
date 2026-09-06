const BaseTenantRepository = require("./base-tenant.repository");
const Designation = require("../models/designation.model");

class DesignationRepository extends BaseTenantRepository {
  constructor() {
    super(Designation);
  }
}

module.exports = new DesignationRepository();

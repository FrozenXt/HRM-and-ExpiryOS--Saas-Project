const BaseTenantRepository = require("./base-tenant.repository");
const Shift = require("../models/shift.model");

class ShiftRepository extends BaseTenantRepository {
  constructor() {
    super(Shift);
  }
}

module.exports = new ShiftRepository();

const BaseTenantRepository = require("./base-tenant.repository");
const Holiday = require("../models/holiday.model");

class HolidayRepository extends BaseTenantRepository {
  constructor() {
    super(Holiday);
  }
}

module.exports = new HolidayRepository();

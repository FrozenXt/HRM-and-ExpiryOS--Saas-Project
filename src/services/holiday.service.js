const BaseTenantService = require("./base-tenant.service");
const holidayRepository = require("../repositories/holiday.repository");

class HolidayService extends BaseTenantService {
  constructor() {
    // No uniqueFields — a company can list more than one holiday on the
    // same date (rare, but not invalid) or reuse a holiday name year to year.
    super(holidayRepository, "Holiday not found");
  }
}

module.exports = new HolidayService();

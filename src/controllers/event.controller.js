const BaseTenantController = require("./base-tenant.controller");
const eventService = require("../services/event.service");

class EventController extends BaseTenantController {
  constructor() {
    super(eventService, "Event");
  }
}

module.exports = new EventController();

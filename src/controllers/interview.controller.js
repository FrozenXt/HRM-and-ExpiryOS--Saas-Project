const BaseTenantController = require("./base-tenant.controller");
const interviewService = require("../services/interview.service");

class InterviewController extends BaseTenantController {
  constructor() {
    super(interviewService, "Interview");
  }
}

module.exports = new InterviewController();

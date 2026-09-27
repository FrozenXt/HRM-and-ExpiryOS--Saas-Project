const BaseTenantController = require("./base-tenant.controller");
const jobPostingService = require("../services/job-posting.service");

module.exports = new BaseTenantController(jobPostingService, "Job posting");

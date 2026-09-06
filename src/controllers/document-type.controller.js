const BaseTenantController = require("./base-tenant.controller");
const documentTypeService = require("../services/document-type.service");

module.exports = new BaseTenantController(documentTypeService, "Document type");

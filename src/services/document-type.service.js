const BaseTenantService = require("./base-tenant.service");
const documentTypeRepository = require("../repositories/document-type.repository");

class DocumentTypeService extends BaseTenantService {
  constructor() {
    super(documentTypeRepository, "Document type not found", ["name"]);
  }
}

module.exports = new DocumentTypeService();

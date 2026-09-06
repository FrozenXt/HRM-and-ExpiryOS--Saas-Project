const BaseTenantRepository = require("./base-tenant.repository");
const DocumentType = require("../models/document-type.model");

class DocumentTypeRepository extends BaseTenantRepository {
  constructor() {
    super(DocumentType);
  }
}

module.exports = new DocumentTypeRepository();

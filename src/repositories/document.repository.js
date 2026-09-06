const BaseTenantRepository = require("./base-tenant.repository");
const Document = require("../models/document.model");

class DocumentRepository extends BaseTenantRepository {
  constructor() {
    super(Document);
  }
}

module.exports = new DocumentRepository();

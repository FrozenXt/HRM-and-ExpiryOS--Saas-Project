const BaseTenantController = require("./base-tenant.controller");
const assetService = require("../services/asset.service");

module.exports = new BaseTenantController(assetService, "Asset");

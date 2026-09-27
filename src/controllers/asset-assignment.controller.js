const BaseTenantController = require("./base-tenant.controller");
const assetAssignmentService = require("../services/asset-assignment.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class AssetAssignmentController extends BaseTenantController {
  constructor() {
    super(assetAssignmentService, "Asset assignment");
    this.returnAsset = this.returnAsset.bind(this);
  }

  async returnAsset(req, res) {
    try {
      const doc = await assetAssignmentService.returnAsset(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Asset marked as returned", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new AssetAssignmentController();

const BaseTenantController = require("./base-tenant.controller");
const offerService = require("../services/offer.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class OfferController extends BaseTenantController {
  constructor() {
    super(offerService, "Offer");

    // custom action, needs binding
    this.generateLetter = this.generateLetter.bind(this);
  }

  async generateLetter(req, res) {
    try {
      const doc = await this.service.generateLetter(req.params.id, req.user);
      return successResponse(res, "Offer letter generated successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new OfferController();

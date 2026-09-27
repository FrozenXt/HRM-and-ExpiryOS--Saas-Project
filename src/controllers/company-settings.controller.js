const companySettingsService = require("../services/company-settings.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class CompanySettingsController {
  async show(req, res) {
    try {
      const settings = await companySettingsService.getSettings(
        req.user,
        req.query.companyId,
      );
      return successResponse(
        res,
        "Company settings fetched successfully",
        settings,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const settings = await companySettingsService.updateSettings(
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Company settings updated successfully",
        settings,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new CompanySettingsController();

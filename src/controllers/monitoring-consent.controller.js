const monitoringConsentService = require("../services/monitoring-consent.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class MonitoringConsentController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await monitoringConsentService.getAll(
        searchHelper,
        req.user,
      );
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Monitoring consents fetched successfully", {
        data: result.data,
        pagination: {
          page: searchHelper.getPage(),
          limit: searchHelper.getLimit(),
          total: result.total,
          total_pages: totalPages,
        },
      });
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async show(req, res) {
    try {
      const doc = await monitoringConsentService.getById(
        req.params.id,
        req.user,
      );
      return successResponse(
        res,
        "Monitoring consent fetched successfully",
        doc,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await monitoringConsentService.record(
        req.body,
        req.ip,
        req.user,
      );
      return successResponse(
        res,
        "Monitoring consent recorded successfully",
        doc,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async me(req, res) {
    try {
      const result = await monitoringConsentService.getMyCurrent(req.user);
      return successResponse(
        res,
        "Current monitoring consent fetched successfully",
        result,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new MonitoringConsentController();

const locationTraceService = require("../services/location-trace.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class LocationTraceController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await locationTraceService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Location traces fetched successfully", {
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
      const trace = await locationTraceService.getById(req.params.id, req.user);
      return successResponse(res, "Location trace fetched successfully", trace);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const trace = await locationTraceService.create(req.body, req.user);
      return successResponse(
        res,
        "Location trace recorded successfully",
        trace,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await locationTraceService.remove(req.params.id, req.user);
      return successResponse(res, "Location trace deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new LocationTraceController();

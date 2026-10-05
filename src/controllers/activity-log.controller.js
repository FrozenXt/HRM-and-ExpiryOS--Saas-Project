const activityLogService = require("../services/activity-log.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class ActivityLogController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await activityLogService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Activity logs fetched successfully", {
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
      const doc = await activityLogService.getById(req.params.id, req.user);
      return successResponse(res, "Activity log fetched successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const result = await activityLogService.ingest(req.body, req.user);
      return successResponse(res, "Activity logged successfully", result, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new ActivityLogController();

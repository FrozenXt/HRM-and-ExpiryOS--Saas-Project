const notificationLogService = require("../services/notification-log.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class NotificationLogController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await notificationLogService.getAll(
        searchHelper,
        req.user,
      );
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Notification logs fetched successfully", {
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
      const log = await notificationLogService.getById(req.params.id, req.user);
      return successResponse(res, "Notification log fetched successfully", log);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const log = await notificationLogService.create(req.body);
      return successResponse(
        res,
        "Notification log recorded successfully",
        log,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await notificationLogService.remove(req.params.id, req.user);
      return successResponse(res, "Notification log deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new NotificationLogController();

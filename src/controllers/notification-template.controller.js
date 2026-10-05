const notificationTemplateService = require("../services/notification-template.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class NotificationTemplateController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await notificationTemplateService.getAll(searchHelper);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(
        res,
        "Notification templates fetched successfully",
        {
          data: result.data,
          pagination: {
            page: searchHelper.getPage(),
            limit: searchHelper.getLimit(),
            total: result.total,
            total_pages: totalPages,
          },
        },
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async show(req, res) {
    try {
      const template = await notificationTemplateService.getById(req.params.id);
      return successResponse(
        res,
        "Notification template fetched successfully",
        template,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const template = await notificationTemplateService.create(req.body);
      return successResponse(
        res,
        "Notification template created successfully",
        template,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const template = await notificationTemplateService.update(
        req.params.id,
        req.body,
      );
      return successResponse(
        res,
        "Notification template updated successfully",
        template,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await notificationTemplateService.remove(req.params.id);
      return successResponse(res, "Notification template deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new NotificationTemplateController();

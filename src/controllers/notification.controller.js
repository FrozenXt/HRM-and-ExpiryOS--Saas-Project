const service = require("../services/notification.service");
const { successResponse, errorResponse } = require("../utils/api-response");

class NotificationController {
  async index(req, res) {
    try {
      const result = await service.list(req.user._id, {
        page: req.query.page,
        limit: req.query.limit,
        unreadOnly: req.query.unread === "true",
      });
      return successResponse(res, "Notifications fetched successfully", result);
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 500);
    }
  }

  async unreadCount(req, res) {
    try {
      const unread = await service.unreadCount(req.user._id);
      return successResponse(res, "Unread count fetched", { unread });
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 500);
    }
  }

  async read(req, res) {
    try {
      await service.markRead(req.user._id, req.params.id);
      return successResponse(res, "Marked as read");
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 400);
    }
  }

  async readAll(req, res) {
    try {
      await service.markAllRead(req.user._id);
      return successResponse(res, "All marked as read");
    } catch (e) {
      return errorResponse(res, e.message, e.statusCode || 500);
    }
  }
}

module.exports = new NotificationController();

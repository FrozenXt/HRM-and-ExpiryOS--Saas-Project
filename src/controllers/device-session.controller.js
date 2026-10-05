const deviceSessionService = require("../services/device-session.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class DeviceSessionController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await deviceSessionService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Device sessions fetched successfully", {
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
      const session = await deviceSessionService.getById(
        req.params.id,
        req.user,
      );
      return successResponse(
        res,
        "Device session fetched successfully",
        session,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const session = await deviceSessionService.create(req.body, req.user);
      return successResponse(
        res,
        "Device session created successfully",
        session,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const session = await deviceSessionService.update(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Device session updated successfully",
        session,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await deviceSessionService.remove(req.params.id, req.user);
      return successResponse(res, "Device session deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new DeviceSessionController();

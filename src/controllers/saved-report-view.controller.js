const savedReportViewService = require("../services/saved-report-view.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class SavedReportViewController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await savedReportViewService.getAll(
        searchHelper,
        req.user,
      );
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Saved report views fetched successfully", {
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
      const view = await savedReportViewService.getById(
        req.params.id,
        req.user,
      );
      return successResponse(
        res,
        "Saved report view fetched successfully",
        view,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const view = await savedReportViewService.create(req.body, req.user);
      return successResponse(
        res,
        "Saved report view created successfully",
        view,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const view = await savedReportViewService.update(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Saved report view updated successfully",
        view,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await savedReportViewService.remove(req.params.id, req.user);
      return successResponse(res, "Saved report view deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new SavedReportViewController();

const performanceReviewService = require("../services/performance-review.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class PerformanceReviewController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await performanceReviewService.getAll(
        searchHelper,
        req.user,
      );
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Performance reviews fetched successfully", {
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
      const review = await performanceReviewService.getById(
        req.params.id,
        req.user,
      );
      return successResponse(
        res,
        "Performance review fetched successfully",
        review,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const review = await performanceReviewService.create(req.body, req.user);
      return successResponse(
        res,
        "Performance review created successfully",
        review,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const review = await performanceReviewService.update(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Performance review updated successfully",
        review,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await performanceReviewService.remove(req.params.id, req.user);
      return successResponse(res, "Performance review deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new PerformanceReviewController();

const regularizationRequestService = require("../services/regularization-request.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class RegularizationRequestController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await regularizationRequestService.getRequests(
        searchHelper,
        req.user,
      );
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(
        res,
        "Regularization requests fetched successfully",
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
      const request = await regularizationRequestService.getRequestById(
        req.params.id,
        req.user,
      );
      return successResponse(
        res,
        "Regularization request fetched successfully",
        request,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const request = await regularizationRequestService.createRequest(
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Regularization request submitted successfully",
        request,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async review(req, res) {
    try {
      const request = await regularizationRequestService.reviewRequest(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(
        res,
        "Regularization request reviewed successfully",
        request,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new RegularizationRequestController();

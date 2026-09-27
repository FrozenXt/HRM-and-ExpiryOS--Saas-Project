const receiptService = require("../services/receipt.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class ReceiptController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await receiptService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Receipts fetched successfully", {
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
      const doc = await receiptService.getById(req.params.id, req.user);
      return successResponse(res, "Receipt fetched successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await receiptService.upload(req.body, req.file, req.user);
      return successResponse(res, "Receipt uploaded successfully", doc, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await receiptService.remove(req.params.id, req.user);
      return successResponse(res, "Receipt deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new ReceiptController();

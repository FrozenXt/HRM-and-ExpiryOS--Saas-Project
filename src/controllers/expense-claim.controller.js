const expenseClaimService = require("../services/expense-claim.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class ExpenseClaimController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await expenseClaimService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Expense claims fetched successfully", {
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
      const doc = await expenseClaimService.getById(req.params.id, req.user);
      return successResponse(res, "Expense claim fetched successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await expenseClaimService.create(req.body, req.user);
      return successResponse(
        res,
        "Expense claim created successfully",
        doc,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const doc = await expenseClaimService.update(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Expense claim updated successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await expenseClaimService.remove(req.params.id, req.user);
      return successResponse(res, "Expense claim deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async submit(req, res) {
    try {
      const doc = await expenseClaimService.submit(req.params.id, req.user);
      return successResponse(res, "Expense claim submitted successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async review(req, res) {
    try {
      const doc = await expenseClaimService.review(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Expense claim reviewed successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async reimburse(req, res) {
    try {
      const doc = await expenseClaimService.reimburse(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Expense claim reimbursed successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new ExpenseClaimController();

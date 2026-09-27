const goalService = require("../services/goal.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class GoalController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await goalService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Goals fetched successfully", {
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
      const goal = await goalService.getById(req.params.id, req.user);
      return successResponse(res, "Goal fetched successfully", goal);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const goal = await goalService.create(req.body, req.user);
      return successResponse(res, "Goal created successfully", goal, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const goal = await goalService.update(req.params.id, req.body, req.user);
      return successResponse(res, "Goal updated successfully", goal);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await goalService.remove(req.params.id, req.user);
      return successResponse(res, "Goal deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new GoalController();

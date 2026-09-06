const planService = require("../services/plan.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class PlanController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await planService.getPlans(searchHelper);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Plans fetched successfully", {
        data: result.data,

        pagination: {
          page: searchHelper.getPage(),
          limit: searchHelper.getLimit(),
          total: result.total,
          total_pages: totalPages,
        },
      });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  async show(req, res) {
    try {
      const plan = await planService.getPlanById(req.params.id);

      return successResponse(res, "Plan fetched successfully", plan);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async store(req, res) {
    try {
      const plan = await planService.createPlan(req.body);

      return successResponse(res, "Plan created successfully", plan, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const plan = await planService.updatePlan(req.params.id, req.body);

      return successResponse(res, "Plan updated successfully", plan);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async destroy(req, res) {
    try {
      await planService.deletePlan(req.params.id);

      return successResponse(res, "Plan deleted successfully");
    } catch (error) {
      const status = error.message === "Plan not found" ? 404 : 409;

      return errorResponse(res, error.message, status);
    }
  }
}

module.exports = new PlanController();

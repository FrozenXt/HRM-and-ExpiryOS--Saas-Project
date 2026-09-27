const onboardingTaskService = require("../services/onboarding-task.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class OnboardingTaskController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await onboardingTaskService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Onboarding tasks fetched successfully", {
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
      const task = await onboardingTaskService.getById(req.params.id, req.user);
      return successResponse(res, "Onboarding task fetched successfully", task);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const task = await onboardingTaskService.create(req.body, req.user);
      return successResponse(
        res,
        "Onboarding task created successfully",
        task,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const task = await onboardingTaskService.update(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Onboarding task updated successfully", task);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await onboardingTaskService.remove(req.params.id, req.user);
      return successResponse(res, "Onboarding task deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new OnboardingTaskController();

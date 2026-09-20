const statutoryRuleService = require("../services/statutory-rule.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class StatutoryRuleController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await statutoryRuleService.getRules(searchHelper);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Statutory rules fetched successfully", {
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
      const rule = await statutoryRuleService.getRuleById(req.params.id);
      return successResponse(res, "Statutory rule fetched successfully", rule);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async store(req, res) {
    try {
      const rule = await statutoryRuleService.createRule(req.body);
      return successResponse(
        res,
        "Statutory rule created successfully",
        rule,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const rule = await statutoryRuleService.updateRule(
        req.params.id,
        req.body,
      );
      return successResponse(res, "Statutory rule updated successfully", rule);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async destroy(req, res) {
    try {
      await statutoryRuleService.deleteRule(req.params.id);
      return successResponse(res, "Statutory rule deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new StatutoryRuleController();

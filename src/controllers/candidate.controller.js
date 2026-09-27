const candidateService = require("../services/candidate.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class CandidateController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await candidateService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Candidates fetched successfully", {
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
      const doc = await candidateService.getById(req.params.id, req.user);
      return successResponse(res, "Candidate fetched successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await candidateService.create(req.body, req.file, req.user);
      return successResponse(res, "Candidate created successfully", doc, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const doc = await candidateService.update(
        req.params.id,
        req.body,
        req.user,
      );
      return successResponse(res, "Candidate updated successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await candidateService.remove(req.params.id, req.user);
      return successResponse(res, "Candidate deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new CandidateController();

const companyDocumentService = require("../services/company-document.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class CompanyDocumentController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await companyDocumentService.getDocuments(
        searchHelper,
        req.user,
      );

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Company documents fetched successfully", {
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
      const doc = await companyDocumentService.getDocumentById(
        req.params.id,
        req.user,
      );

      return successResponse(res, "Company document fetched successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await companyDocumentService.uploadDocument(
        req.body,
        req.user,
      );

      return successResponse(
        res,
        "Company document uploaded successfully",
        doc,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const doc = await companyDocumentService.updateDocument(
        req.params.id,
        req.body,
        req.user,
      );

      return successResponse(res, "Company document updated successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await companyDocumentService.deleteDocument(req.params.id, req.user);

      return successResponse(res, "Company document deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async review(req, res) {
    try {
      const doc = await companyDocumentService.reviewDocument(
        req.params.id,
        req.body,
        req.user,
      );

      return successResponse(
        res,
        "Company document reviewed successfully",
        doc,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new CompanyDocumentController();

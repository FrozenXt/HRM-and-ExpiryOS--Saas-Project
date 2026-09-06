const documentService = require("../services/document.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class DocumentController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await documentService.getDocuments(searchHelper, req.user);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Documents fetched successfully", {
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
      const doc = await documentService.getDocumentById(
        req.params.id,
        req.user,
      );

      return successResponse(res, "Document fetched successfully", doc);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await documentService.uploadDocument(req.body, req.user);

      return successResponse(res, "Document uploaded successfully", doc, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async reupload(req, res) {
    try {
      const doc = await documentService.reuploadDocument(
        req.params.id,
        req.body,
        req.user,
      );

      return successResponse(
        res,
        "New document version uploaded successfully",
        doc,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await documentService.deleteDocument(req.params.id, req.user);

      return successResponse(res, "Document deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = new DocumentController();

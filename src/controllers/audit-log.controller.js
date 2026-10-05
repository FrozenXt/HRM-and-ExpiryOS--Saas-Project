const auditLogService = require("../services/audit-log.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class AuditLogController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await auditLogService.getAll(searchHelper, req.user);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Audit logs fetched successfully", {
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
      const log = await auditLogService.getById(req.params.id, req.user);
      return successResponse(res, "Audit log fetched successfully", log);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async create(req, res) {
    try {
      const log = await auditLogService.create(req.body, req.user);
      return successResponse(res, "Audit log recorded successfully", log, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new AuditLogController();

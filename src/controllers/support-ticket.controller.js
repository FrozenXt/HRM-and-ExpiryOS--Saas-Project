const BaseTenantController = require("./base-tenant.controller");
const supportTicketService = require("../services/support-ticket.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");
const {
  unlinkFiles,
} = require("../middlewares/support-ticket-upload.middleware");

class SupportTicketController extends BaseTenantController {
  constructor() {
    super(supportTicketService, "Support ticket");
    this.index = this.index.bind(this);
    this.store = this.store.bind(this);
    this.comment = this.comment.bind(this);
    this.options = this.options.bind(this);
  }

  // Same shape as the base list, plus `summary` (stat-card counts).
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await supportTicketService.getAll(searchHelper, req.user);

      return successResponse(res, "Support tickets fetched successfully", {
        data: result.data,
        pagination: {
          page: searchHelper.getPage(),
          limit: searchHelper.getLimit(),
          total: result.total,
          total_pages: Math.ceil(result.total / searchHelper.getLimit()),
        },
        summary: result.summary,
      });
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  // POST /support-tickets  (JSON, or multipart with "attachments" files)
  async store(req, res) {
    const files = req.files || [];
    try {
      const doc = await supportTicketService.create(req.body, req.user, files);
      return successResponse(
        res,
        "Support ticket created successfully",
        doc,
        201,
      );
    } catch (error) {
      unlinkFiles(files); // don't leave orphan uploads behind
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // POST /support-tickets/:id/comments
  async comment(req, res) {
    const files = req.files || [];
    try {
      const result = await supportTicketService.addComment(
        req.params.id,
        req.body,
        req.user,
        files,
      );
      return successResponse(res, "Reply added successfully", result, 201);
    } catch (error) {
      unlinkFiles(files);
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // GET /support-tickets/options
  async options(req, res) {
    try {
      const data = await supportTicketService.getOptions(req.user);
      return successResponse(res, "Support ticket options fetched", data);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new SupportTicketController();

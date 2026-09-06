const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class BaseTenantController {
  constructor(service, resourceName) {
    this.service = service;
    this.resourceName = resourceName;

    // Bound so these can be passed directly as Express route handlers.
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.store = this.store.bind(this);
    this.update = this.update.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await this.service.getAll(searchHelper, req.user);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(
        res,
        `${this.resourceName}s fetched successfully`,
        {
          data: result.data,

          pagination: {
            page: searchHelper.getPage(),
            limit: searchHelper.getLimit(),
            total: result.total,
            total_pages: totalPages,
          },
        },
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async show(req, res) {
    try {
      const doc = await this.service.getById(req.params.id, req.user);

      return successResponse(
        res,
        `${this.resourceName} fetched successfully`,
        doc,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const doc = await this.service.create(req.body, req.user);

      return successResponse(
        res,
        `${this.resourceName} created successfully`,
        doc,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const doc = await this.service.update(req.params.id, req.body, req.user);

      return successResponse(
        res,
        `${this.resourceName} updated successfully`,
        doc,
      );
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async destroy(req, res) {
    try {
      await this.service.remove(req.params.id, req.user);

      return successResponse(res, `${this.resourceName} deleted successfully`);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }
}

module.exports = BaseTenantController;

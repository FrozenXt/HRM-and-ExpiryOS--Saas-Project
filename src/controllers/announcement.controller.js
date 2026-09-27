const BaseTenantController = require("./base-tenant.controller");
const announcementService = require("../services/announcement.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class AnnouncementController extends BaseTenantController {
  constructor() {
    super(announcementService, "Announcement");
    this.myFeed = this.myFeed.bind(this);
  }

  async myFeed(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body || {});
      const result = await this.service.getMyFeed(req.user, searchHelper);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Announcements fetched successfully", {
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
}

module.exports = new AnnouncementController();

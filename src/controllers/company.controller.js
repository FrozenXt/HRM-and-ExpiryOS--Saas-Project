const companyService = require("../services/company.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class CompanyController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await companyService.getCompanies(searchHelper);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Companies fetched successfully", {
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
      const company = await companyService.getCompanyById(req.params.id);

      return successResponse(res, "Company fetched successfully", company);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async register(req, res) {
    try {
      const company = await companyService.registerCompany(req.body);

      return successResponse(
        res,
        "Company registered successfully",
        company,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const company = await companyService.updateCompany(
        req.params.id,
        req.body,
      );

      return successResponse(res, "Company updated successfully", company);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async destroy(req, res) {
    try {
      await companyService.deleteCompany(req.params.id);

      return successResponse(res, "Company deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async verify(req, res) {
    try {
      const company = await companyService.setVerificationStatus(
        req.params.id,
        req.body.approved,
        req.user._id,
      );
      return successResponse(res, "Company verification updated", company);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new CompanyController();

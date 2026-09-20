const currencyService = require("../services/currency.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class CurrencyController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await currencyService.getCurrencies(searchHelper);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(res, "Currencies fetched successfully", {
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
      const currency = await currencyService.getCurrencyById(req.params.id);
      return successResponse(res, "Currency fetched successfully", currency);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async store(req, res) {
    try {
      const currency = await currencyService.createCurrency(req.body);
      return successResponse(
        res,
        "Currency created successfully",
        currency,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const currency = await currencyService.updateCurrency(
        req.params.id,
        req.body,
      );
      return successResponse(res, "Currency updated successfully", currency);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async destroy(req, res) {
    try {
      await currencyService.deleteCurrency(req.params.id);
      return successResponse(res, "Currency deleted successfully");
    } catch (error) {
      const status = error.message === "Currency not found" ? 404 : 409;
      return errorResponse(res, error.message, status);
    }
  }
}

module.exports = new CurrencyController();

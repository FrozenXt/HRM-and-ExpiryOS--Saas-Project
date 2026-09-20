const currencyExchangeRateService = require("../services/currency-exchange-rate.service");
const SearchHelper = require("../helpers/search.helper");
const { successResponse, errorResponse } = require("../utils/api-response");

class CurrencyExchangeRateController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);
      const result = await currencyExchangeRateService.getRates(searchHelper);
      const totalPages = Math.ceil(result.total / searchHelper.getLimit());
      return successResponse(
        res,
        "Currency exchange rates fetched successfully",
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
      return errorResponse(res, error.message);
    }
  }

  async show(req, res) {
    try {
      const rate = await currencyExchangeRateService.getRateById(req.params.id);
      return successResponse(
        res,
        "Currency exchange rate fetched successfully",
        rate,
      );
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async store(req, res) {
    try {
      const rate = await currencyExchangeRateService.createRate(req.body);
      return successResponse(
        res,
        "Currency exchange rate created successfully",
        rate,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const rate = await currencyExchangeRateService.updateRate(
        req.params.id,
        req.body,
      );
      return successResponse(
        res,
        "Currency exchange rate updated successfully",
        rate,
      );
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async destroy(req, res) {
    try {
      await currencyExchangeRateService.deleteRate(req.params.id);
      return successResponse(
        res,
        "Currency exchange rate deleted successfully",
      );
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new CurrencyExchangeRateController();

const CurrencyExchangeRate = require("../models/currency-exchange-rate.model");

class CurrencyExchangeRateRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();
    const [data, total] = await Promise.all([
      CurrencyExchangeRate.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      CurrencyExchangeRate.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await CurrencyExchangeRate.findById(id);
  }
  async findExisting(baseCurrencyId, targetCurrencyId, effectiveDate) {
    return await CurrencyExchangeRate.findOne({
      baseCurrencyId,
      targetCurrencyId,
      effectiveDate,
    });
  }
  async create(data) {
    return await CurrencyExchangeRate.create(data);
  }
  async update(id, data) {
    return await CurrencyExchangeRate.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await CurrencyExchangeRate.findByIdAndDelete(id);
  }
}

module.exports = new CurrencyExchangeRateRepository();

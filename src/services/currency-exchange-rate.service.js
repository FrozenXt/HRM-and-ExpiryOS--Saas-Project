const currencyExchangeRateRepository = require("../repositories/currency-exchange-rate.repository");
const currencyRepository = require("../repositories/currency.repository");

class CurrencyExchangeRateService {
  async getRates(searchHelper) {
    return await currencyExchangeRateRepository.findAll(searchHelper);
  }

  async getRateById(id) {
    const rate = await currencyExchangeRateRepository.findById(id);
    if (!rate) throw new Error("Currency exchange rate not found");
    return rate;
  }

  async _validateCurrencies(baseCurrencyId, targetCurrencyId) {
    if (baseCurrencyId === targetCurrencyId) {
      throw new Error("baseCurrencyId and targetCurrencyId must be different");
    }
    const [base, target] = await Promise.all([
      currencyRepository.findById(baseCurrencyId),
      currencyRepository.findById(targetCurrencyId),
    ]);
    if (!base || !target) {
      throw new Error(
        "baseCurrencyId and targetCurrencyId must refer to existing currencies",
      );
    }
  }

  async createRate(data) {
    await this._validateCurrencies(data.baseCurrencyId, data.targetCurrencyId);

    const existing = await currencyExchangeRateRepository.findExisting(
      data.baseCurrencyId,
      data.targetCurrencyId,
      data.effectiveDate,
    );
    if (existing)
      throw new Error("A rate for this currency pair and date already exists");

    return await currencyExchangeRateRepository.create(data);
  }

  async updateRate(id, data) {
    const rate = await currencyExchangeRateRepository.update(id, data);
    if (!rate) throw new Error("Currency exchange rate not found");
    return rate;
  }

  async deleteRate(id) {
    const rate = await currencyExchangeRateRepository.delete(id);
    if (!rate) throw new Error("Currency exchange rate not found");
    return rate;
  }
}

module.exports = new CurrencyExchangeRateService();

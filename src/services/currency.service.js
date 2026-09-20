const currencyRepository = require("../repositories/currency.repository");
const companyRepository = require("../repositories/company.repository");

class CurrencyService {
  async getCurrencies(searchHelper) {
    return await currencyRepository.findAll(searchHelper);
  }

  async getCurrencyById(id) {
    const currency = await currencyRepository.findById(id);
    if (!currency) throw new Error("Currency not found");
    return currency;
  }

  async createCurrency(data) {
    const existing = await currencyRepository.findByCode(data.code);
    if (existing) throw new Error("A currency with this code already exists");
    return await currencyRepository.create(data);
  }

  async updateCurrency(id, data) {
    if (data.code) {
      const existing = await currencyRepository.findByCode(data.code);
      if (existing && existing._id.toString() !== id) {
        throw new Error("A currency with this code already exists");
      }
    }
    const currency = await currencyRepository.update(id, data);
    if (!currency) throw new Error("Currency not found");
    return currency;
  }

  async deleteCurrency(id) {
    // company.repository.js already has existsByCurrencyId from an earlier
    // turn — if this file was regenerated fresh, add that method back there.
    const isInUse = await companyRepository.existsByCurrencyId(id);
    if (isInUse) {
      throw new Error(
        "This currency is assigned to one or more companies and cannot be deleted",
      );
    }
    const currency = await currencyRepository.delete(id);
    if (!currency) throw new Error("Currency not found");
    return currency;
  }
}

module.exports = new CurrencyService();

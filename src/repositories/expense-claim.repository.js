const ExpenseClaim = require("../models/expense-claim.model");

class ExpenseClaimRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      ExpenseClaim.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      ExpenseClaim.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await ExpenseClaim.findById(id);
  }
  async create(data) {
    return await ExpenseClaim.create(data);
  }
  async update(id, data) {
    return await ExpenseClaim.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await ExpenseClaim.findByIdAndDelete(id);
  }
  async existsByCategoryId(categoryId) {
    return await ExpenseClaim.exists({ categoryId });
  }

  // Sums amounts of "active" claims (not draft, not rejected — i.e. ones
  // that count against the monthly limit) for one employee+category+month,
  // used by the monthly-limit check at submit time.
  async sumActiveForMonth(
    employeeId,
    categoryId,
    year,
    month,
    excludeId = null,
  ) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const query = {
      employeeId,
      categoryId,
      expenseDate: { $gte: start, $lt: end },
      status: { $in: ["submitted", "approved", "reimbursed"] },
    };
    if (excludeId) query._id = { $ne: excludeId };

    const claims = await ExpenseClaim.find(query).select("amount");
    return claims.reduce((sum, c) => sum + c.amount, 0);
  }
}

module.exports = new ExpenseClaimRepository();

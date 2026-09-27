const expenseClaimRepository = require("../repositories/expense-claim.repository");
const expenseCategoryRepository = require("../repositories/expense-category.repository");
const employeeRepository = require("../repositories/employee.repository");
const currencyRepository = require("../repositories/currency.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class ExpenseClaimService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await expenseClaimRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await expenseClaimRepository.findById(id);
    if (!doc) throw new Error("Expense claim not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Expense claim not found",
    );
    return doc;
  }

  async create(data, actingUser) {
    let employeeId = data.employeeId;

    if (actingUser.role === "staff") {
      employeeId = await this._getActingEmployeeId(actingUser);
    } else if (!employeeId) {
      throw new Error("employeeId is required");
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee)
      throw new Error("employeeId does not refer to an existing employee");

    if (
      actingUser.role !== "super_admin" &&
      employee.companyId.toString() !== actingUser.companyId.toString()
    ) {
      throw new Error("employeeId must belong to your own company");
    }

    const category = await expenseCategoryRepository.findById(data.categoryId);
    if (
      !category ||
      category.companyId.toString() !== employee.companyId.toString()
    ) {
      throw new Error("categoryId must belong to the same company");
    }

    const currency = await currencyRepository.findById(data.currencyId);
    if (!currency)
      throw new Error("currencyId does not refer to an existing currency");

    return await expenseClaimRepository.create({
      employeeId,
      companyId: employee.companyId,
      categoryId: data.categoryId,
      amount: data.amount,
      currencyId: data.currencyId,
      expenseDate: data.expenseDate,
      description: data.description ?? null,
      status: "draft",
    });
  }

  async update(id, data, actingUser) {
    const doc = await expenseClaimRepository.findById(id);
    if (!doc) throw new Error("Expense claim not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Expense claim not found",
    );

    if (doc.status !== "draft") {
      throw new Error("Only a draft expense claim can be edited");
    }

    const {
      employeeId: _e,
      companyId,
      categoryId,
      currencyId,
      status,
      approvedBy,
      approvedAt,
      reimbursementMethod,
      reimbursedAt,
      ...safeData
    } = data;
    return await expenseClaimRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await expenseClaimRepository.findById(id);
    if (!doc) throw new Error("Expense claim not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Expense claim not found",
    );

    if (doc.status !== "draft") {
      throw new Error("Only a draft expense claim can be deleted");
    }

    await expenseClaimRepository.delete(id);
    return doc;
  }

  async submit(id, actingUser) {
    const doc = await expenseClaimRepository.findById(id);
    if (!doc) throw new Error("Expense claim not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Expense claim not found",
    );

    if (doc.status !== "draft") {
      throw new Error("Only a draft expense claim can be submitted");
    }

    const category = await expenseCategoryRepository.findById(doc.categoryId);
    if (category?.monthlyLimit != null) {
      const expenseDate = new Date(doc.expenseDate);
      const alreadySpent = await expenseClaimRepository.sumActiveForMonth(
        doc.employeeId,
        doc.categoryId,
        expenseDate.getUTCFullYear(),
        expenseDate.getUTCMonth() + 1,
        doc._id,
      );

      if (alreadySpent + doc.amount > category.monthlyLimit) {
        throw new Error(
          `Submitting this claim would exceed the monthly limit for ${category.name} ` +
            `(${alreadySpent} already claimed this month, limit is ${category.monthlyLimit})`,
        );
      }
    }

    return await expenseClaimRepository.update(id, { status: "submitted" });
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async review(id, { status }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error('status must be either "approved" or "rejected"');
    }

    const doc = await expenseClaimRepository.findById(id);
    if (!doc) throw new Error("Expense claim not found");
    TenantScope.assertAccess(actingUser, doc, "Expense claim not found");

    if (doc.status !== "submitted") {
      throw new Error("Only a submitted expense claim can be reviewed");
    }

    return await expenseClaimRepository.update(id, {
      status,
      approvedBy: actingUser._id,
      approvedAt: new Date(),
    });
  }

  async reimburse(id, { reimbursementMethod }, actingUser) {
    if (!["payroll", "bank_transfer", "cash"].includes(reimbursementMethod)) {
      throw new Error(
        'reimbursementMethod must be one of: "payroll", "bank_transfer", "cash"',
      );
    }

    const doc = await expenseClaimRepository.findById(id);
    if (!doc) throw new Error("Expense claim not found");
    TenantScope.assertAccess(actingUser, doc, "Expense claim not found");

    if (doc.status !== "approved") {
      throw new Error("Only an approved expense claim can be reimbursed");
    }

    return await expenseClaimRepository.update(id, {
      status: "reimbursed",
      reimbursementMethod,
      reimbursedAt: new Date(),
    });
  }
}

module.exports = new ExpenseClaimService();

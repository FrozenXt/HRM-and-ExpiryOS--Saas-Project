const receiptRepository = require("../repositories/receipt.repository");
const expenseClaimRepository = require("../repositories/expense-claim.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class ReceiptService {
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
    return await receiptRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await receiptRepository.findById(id);
    if (!doc) throw new Error("Receipt not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Receipt not found",
    );
    return doc;
  }

  async upload(data, file, actingUser) {
    if (!file) throw new Error("file is required");

    const claim = await expenseClaimRepository.findById(data.expenseClaimId);
    if (!claim)
      throw new Error(
        "expenseClaimId does not refer to an existing expense claim",
      );

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      claim,
      employeeId,
      "expenseClaimId does not refer to an existing expense claim",
    );

    return await receiptRepository.create({
      expenseClaimId: claim._id,
      companyId: claim.companyId,
      employeeId: claim.employeeId,
      fileUrl: `/uploads/receipts/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date(),
    });
  }

  async remove(id, actingUser) {
    const doc = await receiptRepository.findById(id);
    if (!doc) throw new Error("Receipt not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Receipt not found",
    );

    const claim = await expenseClaimRepository.findById(doc.expenseClaimId);
    if (claim && !["draft", "submitted"].includes(claim.status)) {
      throw new Error(
        "Cannot delete a receipt once its claim has been reviewed",
      );
    }

    await receiptRepository.delete(id);
    return doc;
  }
}

module.exports = new ReceiptService();

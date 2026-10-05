// services/leave-balance.service.js
const leaveBalanceRepository = require("../repositories/leave-balance.repository");
const employeeRepository = require("../repositories/employee.repository");
const { ensureBalances } = require("../helpers/leave-balance.helper");

class LeaveBalanceService {
  // Every call on this route must be scoped — there is no role here that
  // should see cross-company data. Returns:
  //   - staff: just their own employeeId
  //   - admin / hr: every employeeId belonging to their own company
  // Never returns null; an empty array (company with no employees yet) is a
  // valid, correctly-scoped result — not "no restriction".
  async _employeeScope(user) {
    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) {
        const err = new Error("No employee profile linked to this user");
        err.statusCode = 404;
        throw err;
      }
      return [employee._id];
    }

    // admin / hr — scope to their own company only. This was previously
    // `return null`, which the repository treats as "no filter", leaking
    // every company's leave balances to any admin/hr user.
    if (!user.companyId) {
      const err = new Error("No company associated with this user");
      err.statusCode = 400;
      throw err;
    }

    return await employeeRepository.findIdsByCompany(user.companyId);
  }

  async getAll(searchHelper, user) {
    const scope = await this._employeeScope(user);

    // Fill in any missing balances before listing, so nobody has to set them up.
    if (user.companyId) {
      await ensureBalances({
        companyId: user.companyId,
        employeeIds: scope,
      });
    }

    return await leaveBalanceRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._employeeScope(user);
    const record = await leaveBalanceRepository.findById(id, scope);
    if (!record) {
      const err = new Error("Leave balance not found");
      err.statusCode = 404;
      throw err;
    }
    const [enriched] = await leaveBalanceRepository.enrich([record]);
    return enriched;
  }

  async create() {
    const err = new Error("Leave balances are created automatically");
    err.statusCode = 403;
    throw err;
  }

  async update(id, data, user) {
    // Was `leaveBalanceRepository.update(id, null, data)` — unscoped for
    // every role, which let an admin/hr from one company edit another
    // company's leave balance by _id. Now scoped like every other method.
    const scope = await this._employeeScope(user);
    const record = await leaveBalanceRepository.update(id, scope, data);
    if (!record) {
      const err = new Error("Leave balance not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async remove() {
    const err = new Error("Leave balances cannot be deleted");
    err.statusCode = 403;
    throw err;
  }
}

module.exports = new LeaveBalanceService();

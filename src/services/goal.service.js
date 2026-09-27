const goalRepository = require("../repositories/goal.repository");
const employeeRepository = require("../repositories/employee.repository");

class GoalService {
  // Staff only see/act on their own goals; admin/hr see the whole company;
  // super_admin sees all. Mirrors AttendanceService._scopeFor.
  async _scopeFor(user) {
    const scope = {};
    if (user.role !== "super_admin") scope.companyId = user.companyId;

    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) {
        const err = new Error("No employee profile linked to this user");
        err.statusCode = 404;
        throw err;
      }
      scope.employeeId = employee._id;
    }

    return scope;
  }

  async getAll(searchHelper, user) {
    const scope = await this._scopeFor(user);
    return await goalRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const goal = await goalRepository.findById(id, scope);
    if (!goal) {
      const err = new Error("Goal not found");
      err.statusCode = 404;
      throw err;
    }
    return goal;
  }

  async create(data, user) {
    // Staff setting their own goal: resolve employeeId/companyId from the
    // token rather than trusting the body, so nobody can create a goal
    // under someone else's name.
    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) {
        const err = new Error("No employee profile linked to this user");
        err.statusCode = 404;
        throw err;
      }
      return await goalRepository.create({
        ...data,
        employeeId: employee._id,
        companyId: user.companyId,
      });
    }

    // Admin/HR set goals for someone in their own company; super_admin must
    // specify which company in the body.
    const companyId =
      user.role === "super_admin" ? data.companyId : user.companyId;
    if (!companyId) {
      const err = new Error("companyId is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.employeeId) {
      const err = new Error("employeeId is required");
      err.statusCode = 400;
      throw err;
    }

    return await goalRepository.create({ ...data, companyId });
  }

  async update(id, data, user) {
    const scope = await this._scopeFor(user);
    const goal = await goalRepository.update(id, scope, data);
    if (!goal) {
      const err = new Error("Goal not found");
      err.statusCode = 404;
      throw err;
    }
    return goal;
  }

  async remove(id, user) {
    const scope = await this._scopeFor(user);
    const goal = await goalRepository.delete(id, scope);
    if (!goal) {
      const err = new Error("Goal not found");
      err.statusCode = 404;
      throw err;
    }
    return goal;
  }
}

module.exports = new GoalService();

const onboardingTaskRepository = require("../repositories/onboarding-task.repository");
const employeeRepository = require("../repositories/employee.repository");

class OnboardingTaskService {
  // Staff only see/act on their own tasks (e.g. marking one complete);
  // admin/hr see the whole company; super_admin sees all.
  //
  // NOTE: this does not give an assignedTo user (e.g. an IT admin doing the
  // it_setup task) visibility into a task assigned to them for someone
  // else's onboarding — only the task owner (employee) or company
  // admin/hr/super_admin can see/act on it. Say the word if you want
  // assignedTo-based visibility added too.
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
    return await onboardingTaskRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const task = await onboardingTaskRepository.findById(id, scope);
    if (!task) {
      const err = new Error("Onboarding task not found");
      err.statusCode = 404;
      throw err;
    }
    return task;
  }

  // Admin/HR/Super Admin only (enforced by route authorize) — tasks are
  // assigned to an employee, not self-created by them.
  async create(data, user) {
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
    if (!data.taskName) {
      const err = new Error("taskName is required");
      err.statusCode = 400;
      throw err;
    }

    return await onboardingTaskRepository.create({ ...data, companyId });
  }

  async update(id, data, user) {
    const scope = await this._scopeFor(user);
    const payload = { ...data };
    if (payload.status === "completed" && !payload.completedAt) {
      payload.completedAt = new Date();
    }
    const task = await onboardingTaskRepository.update(id, scope, payload);
    if (!task) {
      const err = new Error("Onboarding task not found");
      err.statusCode = 404;
      throw err;
    }
    return task;
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async remove(id, user) {
    const scope = await this._scopeFor(user);
    const task = await onboardingTaskRepository.delete(id, scope);
    if (!task) {
      const err = new Error("Onboarding task not found");
      err.statusCode = 404;
      throw err;
    }
    return task;
  }
}

module.exports = new OnboardingTaskService();

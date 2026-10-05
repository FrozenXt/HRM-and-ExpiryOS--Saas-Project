const onboardingTaskRepository = require("../repositories/onboarding-task.repository");
const employeeRepository = require("../repositories/employee.repository");
const { notify, notifyBulk } = require("./notification.service");
const User = require("../models/user.model");

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

const day = (d) => new Date(d).toLocaleDateString("en-CA");

class OnboardingTaskService {
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

  // Active Admin and HR users of the company, minus anyone in `skip`.
  async _adminHrIds(companyId, skip = []) {
    const users = await User.find({
      companyId,
      role: { $in: ["admin", "hr"] },
      status: "active",
    })
      .select("_id")
      .lean();
    const skipSet = new Set(skip.map(String));
    return users.map((u) => String(u._id)).filter((id) => !skipSet.has(id));
  }

  // Employee: in-app + email. Admin/HR: in-app. Never throws, so a
  // notification problem can't make the task creation fail.
  async _notifyAssigned(task, employee, actingUser) {
    try {
      const [employeeUser] = await Promise.all([
        User.findById(employee.userId).select("firstName lastName").lean(),
      ]);

      const name = fullName(employeeUser);
      const due = task.dueDate ? ` Due ${day(task.dueDate)}.` : "";

      await notify({
        userId: employee.userId,
        companyId: task.companyId,
        type: "onboarding_task_assigned",
        title: "New onboarding task",
        message: `You have a new onboarding task: ${task.taskName}.${due}`,
        link: "/onboarding",
        entityType: "OnboardingTask",
        entityId: task._id,
        email: {
          templateCode: "generic",
        },
      });

      const adminIds = await this._adminHrIds(task.companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId: task.companyId,
        type: "onboarding_task_assigned",
        title: "Onboarding task assigned",
        message: `${fullName(actingUser)} assigned "${task.taskName}" to ${name}.${due}`,
        link: "/onboarding",
        entityType: "OnboardingTask",
        entityId: task._id,
      });
    } catch (err) {
      console.error("[onboarding] notify failed:", err.message);
    }
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

    // The employee must exist and belong to the same company.
    const employee = await employeeRepository.findById(data.employeeId);
    if (!employee || String(employee.companyId) !== String(companyId)) {
      const err = new Error("employeeId must belong to the same company");
      err.statusCode = 400;
      throw err;
    }

    const created = await onboardingTaskRepository.create({
      ...data,
      companyId,
    });

    await this._notifyAssigned(created, employee, user);

    return created;
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

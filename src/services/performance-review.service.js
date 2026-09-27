const performanceReviewRepository = require("../repositories/performance-review.repository");
const employeeRepository = require("../repositories/employee.repository");

class PerformanceReviewService {
  // Staff only see their own review (as the reviewee, read-only — writes are
  // gated to admin/hr/super_admin at the route level, not here); admin/hr
  // see the whole company; super_admin sees all.
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
    return await performanceReviewRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const review = await performanceReviewRepository.findById(id, scope);
    if (!review) {
      const err = new Error("Performance review not found");
      err.statusCode = 404;
      throw err;
    }
    return review;
  }

  // Admin/HR/Super Admin only (enforced by route authorize) — the reviewer,
  // not the employee being reviewed, creates this.
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
    if (!data.reviewPeriod) {
      const err = new Error("reviewPeriod is required");
      err.statusCode = 400;
      throw err;
    }

    const existing = await performanceReviewRepository.findByEmployeeAndPeriod(
      data.employeeId,
      data.reviewPeriod,
    );
    if (existing) {
      const err = new Error(
        "A performance review already exists for this employee and period",
      );
      err.statusCode = 400;
      throw err;
    }

    return await performanceReviewRepository.create({
      ...data,
      companyId,
      // Defaults to whoever is authoring it; pass reviewerId explicitly in
      // the body if a manager other than the API caller is the reviewer.
      reviewerId: data.reviewerId || user._id,
    });
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async update(id, data, user) {
    const scope = await this._scopeFor(user);
    const payload = { ...data };
    if (payload.status === "submitted" && !payload.submittedAt) {
      payload.submittedAt = new Date();
    }
    const review = await performanceReviewRepository.update(id, scope, payload);
    if (!review) {
      const err = new Error("Performance review not found");
      err.statusCode = 404;
      throw err;
    }
    return review;
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async remove(id, user) {
    const scope = await this._scopeFor(user);
    const review = await performanceReviewRepository.delete(id, scope);
    if (!review) {
      const err = new Error("Performance review not found");
      err.statusCode = 404;
      throw err;
    }
    return review;
  }
}

module.exports = new PerformanceReviewService();

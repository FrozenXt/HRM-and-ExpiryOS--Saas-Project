class TenantScope {
  static scopeFilters(actingUser, filters = {}) {
    if (actingUser.role === "super_admin") {
      return filters;
    }

    return { ...filters, companyId: actingUser.companyId.toString() };
  }

  static resolveCompanyId(actingUser, requestedCompanyId) {
    if (actingUser.role === "super_admin") {
      if (!requestedCompanyId) {
        throw new Error("companyId is required");
      }
      return requestedCompanyId;
    }

    return actingUser.companyId;
  }

  static assertAccess(actingUser, doc, notFoundMessage = "Not found") {
    if (actingUser.role === "super_admin") {
      return;
    }

    if (doc.companyId.toString() !== actingUser.companyId.toString()) {
      const error = new Error(notFoundMessage);
      error.statusCode = 404;
      throw error;
    }
  }

  static scopeToOwnEmployee(actingUser, filters = {}, employeeId = null) {
    const companyScoped = this.scopeFilters(actingUser, filters);

    if (actingUser.role !== "staff") {
      return companyScoped;
    }

    if (!employeeId) {
      throw new Error("No employee profile found for this account");
    }

    return { ...companyScoped, employeeId: employeeId.toString() };
  }

  static assertEmployeeAccess(
    actingUser,
    doc,
    employeeId,
    notFoundMessage = "Not found",
  ) {
    this.assertAccess(actingUser, doc, notFoundMessage);

    if (actingUser.role !== "staff") {
      return;
    }

    if (!employeeId || doc.employeeId.toString() !== employeeId.toString()) {
      const error = new Error(notFoundMessage);
      error.statusCode = 404;
      throw error;
    }
  }
}

module.exports = TenantScope;

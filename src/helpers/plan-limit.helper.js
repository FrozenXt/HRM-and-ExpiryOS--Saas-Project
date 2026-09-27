const Company = require("../models/company.model");
const User = require("../models/user.model");
const Employee = require("../models/employee.model");

// Subscriptions in these states can't add anyone (remove this if you don't want that rule).
const BLOCKED_STATUSES = ["suspended", "cancelled"];

const httpError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

async function assertWithinLimit(companyId, label, countCurrent) {
  const company = await Company.findById(companyId).select(
    "employeeLimit subscriptionStatus",
  );

  if (!company) throw httpError("Company not found", 404);

  if (BLOCKED_STATUSES.includes(company.subscriptionStatus)) {
    throw httpError(
      `This company's subscription is ${company.subscriptionStatus.replace("_", " ")}. New ${label} can't be added.`,
      403,
    );
  }

  const limit = Number(company.employeeLimit) || 0;
  if (!limit) return; // 0 / empty = unlimited

  const current = await countCurrent();
  if (current >= limit) {
    throw httpError(
      `Employee limit reached (${current} of ${limit}). Upgrade the plan or raise the limit to add more ${label}.`,
      403,
    );
  }
}

// Call before creating an Employee profile.
exports.assertCanAddEmployee = (companyId) =>
  assertWithinLimit(companyId, "employees", () =>
    Employee.countDocuments({ companyId }),
  );

// Call before creating a User inside a company.
// Every user is a seat; add `status: "active"` here if inactive users shouldn't count.
exports.assertCanAddUser = (companyId) =>
  assertWithinLimit(companyId, "users", () =>
    User.countDocuments({ companyId }),
  );

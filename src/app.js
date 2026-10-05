const express = require("express");
const path = require("path");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const userRoutes = require("./routes/user.routes");
const companyRoutes = require("./routes/company.routes");
const planRoutes = require("./routes/plan.routes");
const companyDocumentRoutes = require("./routes/company-document.routes");
const departmentRoutes = require("./routes/department.routes");
const designationRoutes = require("./routes/designation.routes");
const leaveTypeRoutes = require("./routes/leave-type.routes");
const documentTypeRoutes = require("./routes/document-type.routes");
const holidayRoutes = require("./routes/holiday.routes");
const employeeRoutes = require("./routes/employee.routes");
const documentRoutes = require("./routes/document.routes");
const expiryReminderLogRoutes = require("./routes/expiry-reminder-log.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const regularizationRequestRoutes = require("./routes/regularization-request.routes");
const leaveBalanceRoutes = require("./routes/leave-balance.routes");
const leaveRequestRoutes = require("./routes/leave-request.routes");
const statutoryRuleRoutes = require("./routes/statutory-rule.routes");
const timeLogRoutes = require("./routes/time-log.routes");
const salaryStructureRoutes = require("./routes/salary-structure.routes");
const currencyRoutes = require("./routes/currency.routes");
const currencyExchangeRateRoutes = require("./routes/currency-exchange-rate.routes");
const employeeStatutoryDetailRoutes = require("./routes/employee-statutory-detail.routes");
const payrollRoutes = require("./routes/payroll.routes");
const payrollStatutoryDeductionRoutes = require("./routes/payroll-statutory-deduction.routes");
const companySettingsRoutes = require("./routes/company-settings.routes");
const jobPostingRoutes = require("./routes/job-posting.routes");
const candidateRoutes = require("./routes/candidate.routes");
const interviewRoutes = require("./routes/interview.routes");
const offerRoutes = require("./routes/offer.routes");
const expenseCategoryRoutes = require("./routes/expense-category.routes");
const expenseClaimRoutes = require("./routes/expense-claim.routes");
const receiptRoutes = require("./routes/receipt.routes");
const assetRoutes = require("./routes/asset.routes");
const assetAssignmentRoutes = require("./routes/asset-assignment.routes");
const authRoutes = require("./routes/auth.routes");
const goalRoutes = require("./routes/goal.routes");
const performanceReviewRoutes = require("./routes/performance-review.routes");
const onboardingTaskRoutes = require("./routes/onboarding-task.routes");
const geofenceZoneRoutes = require("./routes/geofence-zone.routes");
const deviceSession = require("./routes/device-session.routes");
const locationTrace = require("./routes/location-trace.routes");
const monitoringConsentRoutes = require("./routes/monitoring-consent.routes");
const activityLogRoutes = require("./routes/activity-log.routes");
const screenshotRoutes = require("./routes/screenshot.routes");
const swaggerSpec = require("./config/swagger");
const monitoringPolicyRoutes = require("./routes/monitoring-policy.routes");
const shiftRoutes = require("./routes/shift.routes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

// Serves uploaded files (company documents, employee documents) as plain
// static assets — fileUrl values point here, e.g. /uploads/company-documents/169...-cert.pdf
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/company-documents", companyDocumentRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/designations", designationRoutes);
app.use("/api/v1/leave-types", leaveTypeRoutes);
app.use("/api/v1/document-types", documentTypeRoutes);
app.use("/api/v1/holidays", holidayRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/expiry-reminder-logs", expiryReminderLogRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/regularization-requests", regularizationRequestRoutes);
app.use("/api/v1/leave-balances", leaveBalanceRoutes);
app.use("/api/v1/leave-requests", leaveRequestRoutes);
app.use("/api/v1/statutory-rules", statutoryRuleRoutes);
app.use("/api/v1/salary-structures", salaryStructureRoutes);
app.use("/api/v1/time-logs", timeLogRoutes);
app.use("/api/v1/currencies", currencyRoutes);
app.use("/api/v1/currency-exchange-rates", currencyExchangeRateRoutes);
app.use("/api/v1/employee-statutory-details", employeeStatutoryDetailRoutes);
app.use("/api/v1/payroll", payrollRoutes);
app.use("/api/v1/uploads", require("./routes/upload.routes"));
app.use(
  "/api/v1/payroll-statutory-deductions",
  payrollStatutoryDeductionRoutes,
);
app.use("/api/v1/notifications", require("./routes/notification.routes"));
app.use("/api/v1/onboarding-tasks", onboardingTaskRoutes);
app.use("/api/v1/goals", goalRoutes);
app.use("/api/v1/performance-reviews", performanceReviewRoutes);
app.use("/api/v1/job-postings", jobPostingRoutes);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/company-settings", companySettingsRoutes);
app.use("/api/v1/geofence-zones", geofenceZoneRoutes);
console.log("interviewRoutes:", typeof interviewRoutes);
console.log("offerRoutes:", typeof offerRoutes);

app.use("/api/v1/interviews", interviewRoutes);
app.use("/api/v1/offers", offerRoutes);
// app.use("/api/v1/uploads", require("./routes/document-upload.routes")); // if not already mounted for logos
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/uploads", require("./routes/upload.routes"));
app.use("/api/v1/events", require("./routes/event.routes"));
app.use("/api/v1/announcements", require("./routes/announcement.routes"));
app.use("/api/v1/expense-categories", expenseCategoryRoutes);
app.use("/api/v1/expense-claims", expenseClaimRoutes);
app.use("/api/v1/receipts", receiptRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/asset-assignments", assetAssignmentRoutes);
app.use("/api/v1/device-sessions", deviceSession);
app.use("/api/v1/location-traces", locationTrace);
app.use("/api/v1/monitoring-consents", monitoringConsentRoutes);
app.use("/api/v1/activity-logs", activityLogRoutes);
app.use("/api/v1/screenshots", screenshotRoutes);
app.use("/api/v1/monitoring-policy", monitoringPolicyRoutes);
app.use("/api/v1/subscriptions", require("./routes/subscription.routes")); // add this
app.use(
  "/api/v1/notification-templates",
  require("./routes/notification-template.routes"),
);
app.use(
  "/api/v1/notification-logs",
  require("./routes/notification-log.routes"),
);
app.use(
  "/api/v1/saved-report-views",
  require("./routes/saved-report-view.routes"),
);
app.use("/api/v1/dashboard", require("./routes/admin-dashboard.routes"));
app.use("/api/v1/audit-logs", require("./routes/audit-log.routes"));
app.use("/api/v1/dashboard", require("./routes/staff-dashboard.routes"));
app.use("/api/v1/dashboard", require("./routes/admin-dashboard.routes"));
app.use("/api/v1/shifts", shiftRoutes);
app.use("/api/v1/resignations", require("./routes/resignation.routes"));
app.use("/api/v1/transfers", require("./routes/transfer.routes"));
app.use("/api/v1/advance-salaries", require("./routes/advance-salary.routes"));
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Node API is running",
  });
});

module.exports = app;

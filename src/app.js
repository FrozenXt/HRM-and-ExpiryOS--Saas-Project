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

const authRoutes = require("./routes/auth.routes");

const swaggerSpec = require("./config/swagger");

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

app.use("/api/v1/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Node API is running",
  });
});

module.exports = app;

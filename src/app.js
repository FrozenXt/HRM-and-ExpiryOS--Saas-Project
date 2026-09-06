const express = require("express");
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

const authRoutes = require("./routes/auth.routes");

const swaggerSpec = require("./config/swagger");

const app = express();

app.use(express.json());

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

app.use("/api/v1/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Node API is running",
  });
});

module.exports = app;

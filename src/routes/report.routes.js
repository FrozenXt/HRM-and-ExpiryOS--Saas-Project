const express = require("express");
const controller = require("../controllers/employee-report.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();
const guard = [authenticate, authorize("super_admin", "admin", "hr")];

/**
 * @openapi
 * /api/v1/reports/employees/summary:
 *   get:
 *     summary: Employee report - KPIs and chart data
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: from, in: query, schema: { type: string, example: "2026-09-01" }, description: Period start (default 30 days ago) }
 *       - { name: to, in: query, schema: { type: string, example: "2026-09-30" }, description: Period end (default today) }
 *       - { name: departmentId, in: query, schema: { type: string } }
 *       - { name: designationId, in: query, schema: { type: string } }
 *       - { name: status, in: query, schema: { type: string, enum: [active, inactive] } }
 *       - { name: employmentType, in: query, schema: { type: string, enum: [full_time, part_time, contract, intern] } }
 *       - { name: gender, in: query, schema: { type: string } }
 *       - { name: companyId, in: query, schema: { type: string }, description: Super admin only }
 *     responses:
 *       200: { description: OK }
 */
router.get("/employees/summary", ...guard, controller.summary);

/** Same filters, plus page, limit, search, sort (name|department|joiningDate|tenure|hours) and dir (asc|desc). */
router.get("/employees/directory", ...guard, controller.directory);

/** Same filters. Returns an .xlsx file. */
router.get("/employees/export", ...guard, controller.exportExcel);

module.exports = router;

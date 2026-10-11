const express = require("express");
const controller = require("../controllers/company-report.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();
const guard = [authenticate, authorize("super_admin")];

/**
 * @openapi
 * /api/v1/reports/companies/summary:
 *   get:
 *     summary: Company report - KPIs and chart data (super admin)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: from, in: query, schema: { type: string, example: "2026-09-01" } }
 *       - { name: to, in: query, schema: { type: string, example: "2026-09-30" } }
 *       - { name: status, in: query, schema: { type: string, enum: [active, inactive] } }
 *     responses:
 *       200: { description: OK }
 */
router.get("/companies/summary", ...guard, controller.summary);

/** Same filters, plus page, limit, search, sort (name|employees|users|createdAt) and dir (asc|desc). */
router.get("/companies/directory", ...guard, controller.directory);

/** Same filters. Returns an .xlsx file. */
router.get("/companies/export", ...guard, controller.exportExcel);

module.exports = router;

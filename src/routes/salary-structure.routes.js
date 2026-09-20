const express = require("express");
const salaryStructureController = require("../controllers/salary-structure.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SalaryStructure:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         currencyId: { type: string }
 *         wageType: { type: string, enum: [hourly, daily, weekly, monthly, annual] }
 *         payFrequency: { type: string, enum: [weekly, biweekly, semi_monthly, monthly] }
 *         basic: { type: number }
 *         hourlyRate: { type: number, nullable: true }
 *         dailyRate: { type: number, nullable: true }
 *         overtimeRateMultiplier: { type: number, nullable: true, example: 1.5 }
 *         allowances:
 *           type: array
 *           items:
 *             type: object
 *             properties: { name: { type: string }, amount: { type: number } }
 *         deductions:
 *           type: array
 *           items:
 *             type: object
 *             properties: { name: { type: string }, amount: { type: number } }
 */

/**
 * @openapi
 * /api/v1/salary-structures/list:
 *   post:
 *     summary: Get salary structures
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Salary Structures]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer }
 *               limit: { type: integer }
 *               sort: { type: string, enum: [ASC, DESC] }
 *               sort_field: { type: string }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     operator: { type: string }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Salary structures fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  salaryStructureController.index,
);

/**
 * @openapi
 * /api/v1/salary-structures:
 *   post:
 *     summary: Create a salary structure for an employee
 *     description: Admin/HR/Super Admin only. One structure per employee — fails if one already exists.
 *     tags: [Salary Structures]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, currencyId, wageType, payFrequency, basic]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               employeeId: { type: string }
 *               currencyId: { type: string }
 *               wageType: { type: string, enum: [hourly, daily, weekly, monthly, annual] }
 *               payFrequency: { type: string, enum: [weekly, biweekly, semi_monthly, monthly] }
 *               basic: { type: number }
 *               hourlyRate: { type: number, description: "Required if wageType is hourly" }
 *               dailyRate: { type: number, description: "Required if wageType is daily" }
 *               overtimeRateMultiplier: { type: number, example: 1.5 }
 *               allowances:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties: { name: { type: string }, amount: { type: number } }
 *               deductions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties: { name: { type: string }, amount: { type: number } }
 *     responses:
 *       201: { description: Salary structure created successfully }
 *       400: { description: Invalid data, missing rate for wageType, or employee already has a structure }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  salaryStructureController.store,
);

/**
 * @openapi
 * /api/v1/salary-structures/{id}:
 *   get:
 *     summary: Get a salary structure by ID
 *     tags: [Salary Structures]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Salary structure fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Salary structure not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  salaryStructureController.show,
);

/**
 * @openapi
 * /api/v1/salary-structures/{id}:
 *   put:
 *     summary: Update a salary structure
 *     description: Admin/HR/Super Admin only.
 *     tags: [Salary Structures]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currencyId: { type: string }
 *               wageType: { type: string, enum: [hourly, daily, weekly, monthly, annual] }
 *               payFrequency: { type: string, enum: [weekly, biweekly, semi_monthly, monthly] }
 *               basic: { type: number }
 *               hourlyRate: { type: number }
 *               dailyRate: { type: number }
 *               overtimeRateMultiplier: { type: number }
 *               allowances:
 *                 type: array
 *                 items: { type: object }
 *               deductions:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200: { description: Salary structure updated successfully }
 *       400: { description: Missing rate for wageType }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Salary structure not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  salaryStructureController.update,
);

/**
 * @openapi
 * /api/v1/salary-structures/{id}:
 *   delete:
 *     summary: Delete a salary structure
 *     description: Admin/HR/Super Admin only.
 *     tags: [Salary Structures]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Salary structure deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Salary structure not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  salaryStructureController.destroy,
);

module.exports = router;

const express = require("express");
const payrollStatutoryDeductionController = require("../controllers/payroll-statutory-deduction.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     PayrollStatutoryDeduction:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         payrollId: { type: string }
 *         companyId: { type: string }
 *         pfEmployeeContribution: { type: number, default: 0 }
 *         pfEmployerContribution: { type: number, default: 0 }
 *         esiEmployeeContribution: { type: number, default: 0 }
 *         esiEmployerContribution: { type: number, default: 0 }
 *         professionalTax: { type: number, default: 0 }
 *         tds: { type: number, default: 0 }
 *         gratuityAccrued: { type: number, default: 0 }
 *         otherDeductions: { type: number, default: 0 }
 */

/**
 * @openapi
 * /api/v1/payroll-statutory-deductions/list:
 *   post:
 *     summary: Get payroll statutory deduction breakdowns
 *     description: Admin/HR/Super Admin only — not staff-accessible via list (see individual record access notes).
 *     tags: [Payroll Statutory Deductions]
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
 *       200: { description: Payroll statutory deductions fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollStatutoryDeductionController.index,
);

/**
 * @openapi
 * /api/v1/payroll-statutory-deductions:
 *   post:
 *     summary: Create the deduction breakdown for a payroll record
 *     description: Admin/HR/Super Admin only. One breakdown per payroll record.
 *     tags: [Payroll Statutory Deductions]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payrollId]
 *             properties:
 *               payrollId: { type: string }
 *               pfEmployeeContribution: { type: number }
 *               pfEmployerContribution: { type: number }
 *               esiEmployeeContribution: { type: number }
 *               esiEmployerContribution: { type: number }
 *               professionalTax: { type: number }
 *               tds: { type: number }
 *               gratuityAccrued: { type: number }
 *               otherDeductions: { type: number }
 *     responses:
 *       201: { description: Payroll statutory deduction created successfully }
 *       400: { description: Invalid payrollId, or a breakdown already exists for it }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollStatutoryDeductionController.store,
);

/**
 * @openapi
 * /api/v1/payroll-statutory-deductions/{id}:
 *   get:
 *     summary: Get a payroll statutory deduction by ID
 *     tags: [Payroll Statutory Deductions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Payroll statutory deduction fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Payroll statutory deduction not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollStatutoryDeductionController.show,
);

/**
 * @openapi
 * /api/v1/payroll-statutory-deductions/{id}:
 *   put:
 *     summary: Update a payroll statutory deduction breakdown
 *     description: Admin/HR/Super Admin only.
 *     tags: [Payroll Statutory Deductions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pfEmployeeContribution: { type: number }
 *               pfEmployerContribution: { type: number }
 *               esiEmployeeContribution: { type: number }
 *               esiEmployerContribution: { type: number }
 *               professionalTax: { type: number }
 *               tds: { type: number }
 *               gratuityAccrued: { type: number }
 *               otherDeductions: { type: number }
 *     responses:
 *       200: { description: Payroll statutory deduction updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Payroll statutory deduction not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollStatutoryDeductionController.update,
);

/**
 * @openapi
 * /api/v1/payroll-statutory-deductions/{id}:
 *   delete:
 *     summary: Delete a payroll statutory deduction breakdown
 *     description: Admin/HR/Super Admin only.
 *     tags: [Payroll Statutory Deductions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Payroll statutory deduction deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Payroll statutory deduction not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollStatutoryDeductionController.destroy,
);

module.exports = router;

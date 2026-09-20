const express = require("express");
const payrollController = require("../controllers/payroll.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  buildUploader,
  handleUploadErrors,
} = require("../middlewares/upload.middleware");

const uploadPayslip = handleUploadErrors(
  buildUploader("payslips").single("file"),
);

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Payroll:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         currencyId: { type: string }
 *         wageType: { type: string, enum: [hourly, daily, weekly, monthly, annual] }
 *         period: { type: string, example: "2026-09" }
 *         payableDays: { type: number }
 *         regularHours: { type: number, nullable: true }
 *         overtimeHours: { type: number, nullable: true }
 *         grossPay: { type: number }
 *         overtimePay: { type: number, default: 0 }
 *         deductions: { type: number }
 *         netPay: { type: number }
 *         status: { type: string, enum: [draft, approved, released] }
 *         payslipUrl: { type: string, nullable: true }
 *         approvedBy: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/payroll/list:
 *   post:
 *     summary: Get payroll records
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Payroll]
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
 *               sort_field: { type: string, example: period }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: status }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: released }
 *     responses:
 *       200: { description: Payrolls fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  payrollController.index,
);

/**
 * @openapi
 * /api/v1/payroll:
 *   post:
 *     summary: Create a draft payroll record
 *     description: >
 *       Admin/HR/Super Admin only. Manual entry — netPay must equal
 *       grossPay + overtimePay - deductions. One record per employee per period.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, currencyId, wageType, period, payableDays, grossPay, deductions, netPay]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               employeeId: { type: string }
 *               currencyId: { type: string }
 *               wageType: { type: string, enum: [hourly, daily, weekly, monthly, annual] }
 *               period: { type: string, example: "2026-09" }
 *               payableDays: { type: number }
 *               regularHours: { type: number }
 *               overtimeHours: { type: number }
 *               grossPay: { type: number }
 *               overtimePay: { type: number, default: 0 }
 *               deductions: { type: number }
 *               netPay: { type: number }
 *     responses:
 *       201: { description: Payroll created successfully }
 *       400: { description: Invalid data, amounts don't add up, or duplicate employee+period }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollController.store,
);

/**
 * @openapi
 * /api/v1/payroll/{id}:
 *   get:
 *     summary: Get a payroll record by ID
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Payroll fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Payroll not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  payrollController.show,
);

/**
 * @openapi
 * /api/v1/payroll/{id}:
 *   put:
 *     summary: Edit a draft payroll record
 *     description: Only a still-draft record can be edited. Admin/HR/Super Admin only.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payableDays: { type: number }
 *               regularHours: { type: number }
 *               overtimeHours: { type: number }
 *               grossPay: { type: number }
 *               overtimePay: { type: number }
 *               deductions: { type: number }
 *               netPay: { type: number }
 *     responses:
 *       200: { description: Payroll updated successfully }
 *       400: { description: Not a draft, or amounts don't add up }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Payroll not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollController.update,
);

/**
 * @openapi
 * /api/v1/payroll/{id}:
 *   delete:
 *     summary: Delete a draft payroll record
 *     description: Only a still-draft record can be deleted. Admin/HR/Super Admin only.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Payroll deleted successfully }
 *       400: { description: Not a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Payroll not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollController.destroy,
);

/**
 * @openapi
 * /api/v1/payroll/{id}/approve:
 *   post:
 *     summary: Approve a draft payroll record
 *     description: Admin/HR/Super Admin only.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Payroll approved successfully }
 *       400: { description: Not a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/:id/approve",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  payrollController.approve,
);

/**
 * @openapi
 * /api/v1/payroll/{id}/release:
 *   post:
 *     summary: Release an approved payroll record (optionally attaching the payslip)
 *     description: Admin/HR/Super Admin only. Only an approved record can be released.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary, description: "Optional payslip PDF" }
 *     responses:
 *       200: { description: Payroll released successfully }
 *       400: { description: Not approved yet }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/:id/release",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  uploadPayslip,
  payrollController.release,
);

module.exports = router;

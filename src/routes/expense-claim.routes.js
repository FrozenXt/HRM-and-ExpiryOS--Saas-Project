const express = require("express");
const expenseClaimController = require("../controllers/expense-claim.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ExpenseClaim:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         categoryId: { type: string }
 *         amount: { type: number }
 *         currencyId: { type: string }
 *         expenseDate: { type: string, format: date }
 *         description: { type: string, nullable: true }
 *         status: { type: string, enum: [draft, submitted, approved, rejected, reimbursed] }
 *         approvedBy: { type: string, nullable: true }
 *         approvedAt: { type: string, format: date-time, nullable: true }
 *         reimbursementMethod: { type: string, enum: [payroll, bank_transfer, cash], nullable: true }
 *         reimbursedAt: { type: string, format: date-time, nullable: true }
 */

/**
 * @openapi
 * /api/v1/expense-claims/list:
 *   post:
 *     summary: Get expense claims
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Expense Claims]
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
 *               sort_field: { type: string, example: expenseDate }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: status }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: submitted }
 *     responses:
 *       200: { description: Expense claims fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseClaimController.index,
);

/**
 * @openapi
 * /api/v1/expense-claims:
 *   post:
 *     summary: Create a draft expense claim
 *     description: Staff always create for their own employeeId. Admin/HR/Super Admin must supply employeeId.
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, amount, currencyId, expenseDate]
 *             properties:
 *               employeeId: { type: string, description: "Required unless caller is staff" }
 *               categoryId: { type: string }
 *               amount: { type: number }
 *               currencyId: { type: string }
 *               expenseDate: { type: string, format: date }
 *               description: { type: string }
 *     responses:
 *       201: { description: Expense claim created successfully }
 *       400: { description: Invalid data or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseClaimController.store,
);

/**
 * @openapi
 * /api/v1/expense-claims/{id}:
 *   get:
 *     summary: Get an expense claim by ID
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Expense claim fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expense claim not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseClaimController.show,
);

/**
 * @openapi
 * /api/v1/expense-claims/{id}:
 *   put:
 *     summary: Edit a draft expense claim
 *     description: Only a still-draft claim can be edited.
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               expenseDate: { type: string, format: date }
 *               description: { type: string }
 *     responses:
 *       200: { description: Expense claim updated successfully }
 *       400: { description: Claim is no longer a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expense claim not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseClaimController.update,
);

/**
 * @openapi
 * /api/v1/expense-claims/{id}:
 *   delete:
 *     summary: Delete a draft expense claim
 *     description: Only a still-draft claim can be deleted.
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Expense claim deleted successfully }
 *       400: { description: Claim is no longer a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expense claim not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseClaimController.destroy,
);

/**
 * @openapi
 * /api/v1/expense-claims/{id}/submit:
 *   post:
 *     summary: Submit a draft expense claim for approval
 *     description: Fails if it would push the employee's spend in that category/month over the category's monthlyLimit.
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Expense claim submitted successfully }
 *       400: { description: Not a draft, or would exceed the monthly limit }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/:id/submit",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseClaimController.submit,
);

/**
 * @openapi
 * /api/v1/expense-claims/{id}/review:
 *   put:
 *     summary: Approve or reject a submitted expense claim
 *     description: Admin/HR/Super Admin only.
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *     responses:
 *       200: { description: Expense claim reviewed successfully }
 *       400: { description: Invalid status, or claim isn't submitted }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.put(
  "/:id/review",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expenseClaimController.review,
);

/**
 * @openapi
 * /api/v1/expense-claims/{id}/reimburse:
 *   post:
 *     summary: Mark an approved expense claim as reimbursed
 *     description: Admin/HR/Super Admin only.
 *     tags: [Expense Claims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reimbursementMethod]
 *             properties:
 *               reimbursementMethod: { type: string, enum: [payroll, bank_transfer, cash] }
 *     responses:
 *       200: { description: Expense claim reimbursed successfully }
 *       400: { description: Invalid method, or claim isn't approved }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/:id/reimburse",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expenseClaimController.reimburse,
);

module.exports = router;

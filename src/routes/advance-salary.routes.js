const express = require("express");

const advanceSalaryController = require("../controllers/advance-salary.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     AdvanceSalary:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         id_int:
 *           type: integer
 *           example: 3
 *         employeeId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         companyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         currencyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         amount:
 *           type: integer
 *           example: 30000
 *         reason:
 *           type: string
 *           example: Medical expenses
 *         installments:
 *           type: integer
 *           example: 3
 *         installmentAmount:
 *           type: integer
 *           example: 10000
 *         startPeriod:
 *           type: string
 *           nullable: true
 *           description: First payroll month (YYYY-MM) an installment is deducted.
 *           example: 2026-11
 *         status:
 *           type: string
 *           enum:
 *             - pending
 *             - approved
 *             - rejected
 *             - cancelled
 *             - closed
 *           example: pending
 *         recoveredAmount:
 *           type: integer
 *           example: 0
 *         repayments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 example: 2026-11
 *               amount:
 *                 type: integer
 *                 example: 10000
 *               payrollId:
 *                 type: string
 *                 nullable: true
 *               recordedAt:
 *                 type: string
 *                 format: date-time
 *         approvedBy:
 *           type: string
 *           nullable: true
 *         approvedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         remarks:
 *           type: string
 *           nullable: true
 *         closedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/advance-salaries/list:
 *   post:
 *     summary: Get advance salary requests
 *     description: >
 *       Get a paginated and filtered list of advance salary requests. Admin
 *       and HR see their whole company, Staff see only their own.
 *     tags:
 *       - Advance Salary
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *
 *               sort:
 *                 type: string
 *                 enum:
 *                   - ASC
 *                   - DESC
 *                 example: DESC
 *
 *               sort_field:
 *                 type: string
 *                 example: createdAt
 *
 *               fields:
 *                 type: array
 *                 description: List of filters to apply.
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: status
 *
 *                     operator:
 *                       type: string
 *                       enum:
 *                         - eq
 *                         - ne
 *                         - gt
 *                         - gte
 *                         - lt
 *                         - lte
 *                         - contains
 *                         - starts_with
 *                         - ends_with
 *                         - in
 *                       example: eq
 *
 *                     value:
 *                       type: string
 *                       example: pending
 *
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: DESC
 *             sort_field: createdAt
 *             fields:
 *               - field: status
 *                 operator: eq
 *                 value: pending
 *
 *     responses:
 *       200:
 *         description: Advance salary requests fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: No employee profile linked to this account (Staff)
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  advanceSalaryController.index,
);

/**
 * @openapi
 * /api/v1/advance-salaries:
 *   post:
 *     summary: Request an advance salary
 *     description: >
 *       Staff request their own. Admin, HR and Super Admin can request one on
 *       behalf of an employee by passing employeeId. The amount cannot exceed
 *       50% of the employee's basic salary, installments are 1 to 12, and an
 *       employee can only have one pending or unrecovered advance at a time.
 *     tags:
 *       - Advance Salary
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - installments
 *               - reason
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Required for Admin/HR/Super Admin. Ignored for Staff.
 *                 example: 68ba1234567890abcdef1234
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 example: 30000
 *               installments:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 3
 *               reason:
 *                 type: string
 *                 example: Medical expenses
 *
 *     responses:
 *       201:
 *         description: Advance salary request created successfully
 *
 *       400:
 *         description: Invalid data, no salary structure, amount over the cap, or an open advance already exists
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  advanceSalaryController.create,
);

/**
 * @openapi
 * /api/v1/advance-salaries/{id}:
 *   get:
 *     summary: Get an advance salary request by ID
 *     description: Staff can only open their own request.
 *     tags:
 *       - Advance Salary
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Advance salary MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Advance salary request fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Advance salary request not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  advanceSalaryController.show,
);

/**
 * @openapi
 * /api/v1/advance-salaries/{id}/review:
 *   patch:
 *     summary: Approve or reject an advance salary request
 *     description: >
 *       Admin, HR and Super Admin only. Only a pending request can be
 *       reviewed, and nobody can review their own. Once approved, the
 *       installments are deducted from payroll starting at startPeriod.
 *     tags:
 *       - Advance Salary
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Advance salary MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - approved
 *                   - rejected
 *                 example: approved
 *               startPeriod:
 *                 type: string
 *                 description: >
 *                   Only for approval. First payroll month to deduct from,
 *                   in YYYY-MM format. Defaults to next month and cannot be
 *                   before the current month.
 *                 example: 2026-11
 *               remarks:
 *                 type: string
 *                 description: Required when rejecting.
 *                 example: Amount exceeds what we can approve this quarter
 *
 *     responses:
 *       200:
 *         description: Advance salary request reviewed successfully
 *
 *       400:
 *         description: Invalid status or startPeriod, missing remarks on rejection, or request is not pending
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions, or reviewing your own request
 *
 *       404:
 *         description: Advance salary request not found
 */
router.patch(
  "/:id/review",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  advanceSalaryController.review,
);

/**
 * @openapi
 * /api/v1/advance-salaries/{id}/cancel:
 *   patch:
 *     summary: Cancel an advance salary request
 *     description: >
 *       Staff can cancel their own pending request. Admin, HR and Super Admin
 *       can also cancel an approved one, as long as nothing has been
 *       recovered yet.
 *     tags:
 *       - Advance Salary
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Advance salary MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Advance salary request cancelled successfully
 *
 *       400:
 *         description: Request can no longer be cancelled
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Advance salary request not found
 */
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  advanceSalaryController.cancel,
);

/**
 * @openapi
 * /api/v1/advance-salaries/{id}:
 *   delete:
 *     summary: Delete an advance salary request
 *     description: >
 *       Admin, HR and Super Admin only. An approved or closed advance cannot
 *       be deleted.
 *     tags:
 *       - Advance Salary
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Advance salary MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Advance salary request deleted successfully
 *
 *       400:
 *         description: Advance is approved or closed
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Advance salary request not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  advanceSalaryController.destroy,
);

module.exports = router;

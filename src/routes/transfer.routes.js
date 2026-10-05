const express = require("express");

const transferController = require("../controllers/transfer.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Transfer:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         id_int:
 *           type: integer
 *           example: 7
 *         employeeId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         companyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         fromDepartmentId:
 *           type: string
 *           nullable: true
 *         fromDesignationId:
 *           type: string
 *           nullable: true
 *         fromReportingManagerId:
 *           type: string
 *           nullable: true
 *         fromShiftId:
 *           type: string
 *           nullable: true
 *         toDepartmentId:
 *           type: string
 *           nullable: true
 *         toDesignationId:
 *           type: string
 *           nullable: true
 *         toReportingManagerId:
 *           type: string
 *           nullable: true
 *         toShiftId:
 *           type: string
 *           nullable: true
 *         effectiveDate:
 *           type: string
 *           format: date
 *           example: 2026-12-01
 *         reason:
 *           type: string
 *           nullable: true
 *           example: Moving to the sales team
 *         status:
 *           type: string
 *           enum:
 *             - pending
 *             - approved
 *             - rejected
 *             - applied
 *             - cancelled
 *           example: pending
 *         requestedBy:
 *           type: string
 *         reviewedBy:
 *           type: string
 *           nullable: true
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         remarks:
 *           type: string
 *           nullable: true
 *         appliedAt:
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
 * /api/v1/transfers/list:
 *   post:
 *     summary: Get transfers
 *     description: >
 *       Get a paginated and filtered list of transfers. Admin and HR see
 *       their whole company, Staff see only their own.
 *     tags:
 *       - Transfers
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
 *         description: Transfers fetched successfully
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
  transferController.index,
);

/**
 * @openapi
 * /api/v1/transfers:
 *   post:
 *     summary: Create a transfer
 *     description: >
 *       Admin, HR and Super Admin only. Set at least one new value
 *       (department, designation, reporting manager or shift). Anything left
 *       out stays unchanged. The transfer starts as pending, and an employee
 *       can only have one open transfer.
 *     tags:
 *       - Transfers
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
 *               - employeeId
 *               - effectiveDate
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 description: Cannot be in the past.
 *                 example: 2026-12-01
 *               toDepartmentId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               toDesignationId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               toReportingManagerId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               toShiftId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               reason:
 *                 type: string
 *                 example: Moving to the sales team
 *
 *     responses:
 *       201:
 *         description: Transfer created successfully
 *
 *       400:
 *         description: Invalid data, nothing to change, target not in the same company, or an open transfer already exists
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
  authorize("super_admin", "admin", "hr"),
  transferController.create,
);

/**
 * @openapi
 * /api/v1/transfers/{id}:
 *   get:
 *     summary: Get a transfer by ID
 *     description: Staff can only open their own transfer.
 *     tags:
 *       - Transfers
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transfer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Transfer fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Transfer not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  transferController.show,
);

/**
 * @openapi
 * /api/v1/transfers/{id}/review:
 *   patch:
 *     summary: Approve or reject a transfer
 *     description: >
 *       Admin, HR and Super Admin only. Only a pending transfer can be
 *       reviewed, and nobody can review their own. If the effective date has
 *       already arrived, approving applies the transfer straight away.
 *       Otherwise it is applied automatically on the effective date.
 *     tags:
 *       - Transfers
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transfer MongoDB ObjectId
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
 *               remarks:
 *                 type: string
 *                 description: Required when rejecting.
 *                 example: Approved by the department head
 *
 *     responses:
 *       200:
 *         description: Transfer reviewed successfully
 *
 *       400:
 *         description: Invalid status, missing remarks on rejection, or transfer is not pending
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions, or reviewing your own transfer
 *
 *       404:
 *         description: Transfer not found
 */
router.patch(
  "/:id/review",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  transferController.review,
);

/**
 * @openapi
 * /api/v1/transfers/{id}/cancel:
 *   patch:
 *     summary: Cancel a transfer
 *     description: >
 *       Admin, HR and Super Admin only. A pending or approved transfer can be
 *       cancelled until it has been applied.
 *     tags:
 *       - Transfers
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transfer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Transfer cancelled successfully
 *
 *       400:
 *         description: Transfer can no longer be cancelled
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Transfer not found
 */
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  transferController.cancel,
);

/**
 * @openapi
 * /api/v1/transfers/{id}:
 *   delete:
 *     summary: Delete a transfer
 *     description: >
 *       Admin, HR and Super Admin only. An approved or applied transfer
 *       cannot be deleted.
 *     tags:
 *       - Transfers
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transfer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Transfer deleted successfully
 *
 *       400:
 *         description: Transfer is approved or applied
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Transfer not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  transferController.destroy,
);

module.exports = router;

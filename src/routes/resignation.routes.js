const express = require("express");

const resignationController = require("../controllers/resignation.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Resignation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         id_int:
 *           type: integer
 *           example: 12
 *         employeeId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         companyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         reason:
 *           type: string
 *           example: Relocating to another city
 *         resignationDate:
 *           type: string
 *           format: date-time
 *         proposedLastWorkingDay:
 *           type: string
 *           format: date
 *           example: 2026-11-30
 *         lastWorkingDay:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: 2026-11-30
 *         status:
 *           type: string
 *           enum:
 *             - pending
 *             - approved
 *             - rejected
 *             - withdrawn
 *             - completed
 *           example: pending
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
 *         completedAt:
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
 * /api/v1/resignations/list:
 *   post:
 *     summary: Get resignations
 *     description: >
 *       Get a paginated and filtered list of resignations. Admin and HR see
 *       their whole company, Staff see only their own.
 *     tags:
 *       - Resignations
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
 *         description: Resignations fetched successfully
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
  resignationController.index,
);

/**
 * @openapi
 * /api/v1/resignations:
 *   post:
 *     summary: Submit a resignation
 *     description: >
 *       Staff submit their own resignation. Admin, HR and Super Admin can
 *       submit one on behalf of an employee by passing employeeId. An
 *       employee can only have one open (pending or approved) resignation.
 *     tags:
 *       - Resignations
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
 *               - reason
 *               - proposedLastWorkingDay
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Required for Admin/HR/Super Admin. Ignored for Staff.
 *                 example: 68ba1234567890abcdef1234
 *               reason:
 *                 type: string
 *                 example: Relocating to another city
 *               proposedLastWorkingDay:
 *                 type: string
 *                 format: date
 *                 description: Cannot be in the past.
 *                 example: 2026-11-30
 *
 *     responses:
 *       201:
 *         description: Resignation submitted successfully
 *
 *       400:
 *         description: Invalid data, inactive employee, or an open resignation already exists
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
  resignationController.create,
);

/**
 * @openapi
 * /api/v1/resignations/{id}:
 *   get:
 *     summary: Get a resignation by ID
 *     description: Staff can only open their own resignation.
 *     tags:
 *       - Resignations
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Resignation MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Resignation fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Resignation not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  resignationController.show,
);

/**
 * @openapi
 * /api/v1/resignations/{id}/review:
 *   patch:
 *     summary: Approve or reject a resignation
 *     description: >
 *       Admin, HR and Super Admin only. Only a pending resignation can be
 *       reviewed, and nobody can review their own. Approving also switches
 *       off the employee's login. The employee becomes inactive after the
 *       last working day.
 *     tags:
 *       - Resignations
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Resignation MongoDB ObjectId
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
 *               lastWorkingDay:
 *                 type: string
 *                 format: date
 *                 description: Only for approval. Defaults to the proposed date.
 *                 example: 2026-11-30
 *               remarks:
 *                 type: string
 *                 description: Required when rejecting.
 *                 example: Please complete the handover first
 *
 *     responses:
 *       200:
 *         description: Resignation reviewed successfully
 *
 *       400:
 *         description: Invalid status, missing remarks on rejection, or resignation is not pending
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions, or reviewing your own resignation
 *
 *       404:
 *         description: Resignation not found
 */
router.patch(
  "/:id/review",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  resignationController.review,
);

/**
 * @openapi
 * /api/v1/resignations/{id}/withdraw:
 *   patch:
 *     summary: Withdraw a resignation
 *     description: Only a pending resignation can be withdrawn. Staff can only withdraw their own.
 *     tags:
 *       - Resignations
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Resignation MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Resignation withdrawn successfully
 *
 *       400:
 *         description: Resignation is not pending
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Resignation not found
 */
router.patch(
  "/:id/withdraw",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  resignationController.withdraw,
);

/**
 * @openapi
 * /api/v1/resignations/{id}:
 *   delete:
 *     summary: Delete a resignation
 *     description: >
 *       Admin, HR and Super Admin only. An approved or completed resignation
 *       cannot be deleted.
 *     tags:
 *       - Resignations
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Resignation MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Resignation deleted successfully
 *
 *       400:
 *         description: Resignation is approved or completed
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Resignation not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  resignationController.destroy,
);

module.exports = router;

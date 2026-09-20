const express = require("express");
const regularizationRequestController = require("../controllers/regularization-request.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     RegularizationRequest:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         attendanceId: { type: string }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         requestedBy: { type: string }
 *         reason: { type: string }
 *         requestedCheckIn: { type: string, format: date-time, nullable: true }
 *         requestedCheckOut: { type: string, format: date-time, nullable: true }
 *         status: { type: string, enum: [pending, approved, rejected] }
 *         approvedBy: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/regularization-requests/list:
 *   post:
 *     summary: Get regularization requests
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Regularization Requests]
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
 *       200: { description: Regularization requests fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  regularizationRequestController.index,
);

/**
 * @openapi
 * /api/v1/regularization-requests:
 *   post:
 *     summary: Submit a regularization request
 *     description: Staff can only submit for their own attendance record.
 *     tags: [Regularization Requests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attendanceId, reason]
 *             properties:
 *               attendanceId: { type: string }
 *               reason: { type: string, example: "Forgot to check out, left at 6pm" }
 *               requestedCheckIn: { type: string, format: date-time }
 *               requestedCheckOut: { type: string, format: date-time }
 *     responses:
 *       201: { description: Regularization request submitted successfully }
 *       400: { description: Invalid data, or attendance doesn't belong to you }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  regularizationRequestController.store,
);

/**
 * @openapi
 * /api/v1/regularization-requests/{id}:
 *   get:
 *     summary: Get a regularization request by ID
 *     tags: [Regularization Requests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Regularization request fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Regularization request not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  regularizationRequestController.show,
);

/**
 * @openapi
 * /api/v1/regularization-requests/{id}/review:
 *   put:
 *     summary: Approve or reject a regularization request
 *     description: Admin/HR/Super Admin only. Approving applies the requested check-in/check-out to the Attendance record.
 *     tags: [Regularization Requests]
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
 *       200: { description: Regularization request reviewed successfully }
 *       400: { description: Invalid status, or already reviewed }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.put(
  "/:id/review",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  regularizationRequestController.review,
);

module.exports = router;

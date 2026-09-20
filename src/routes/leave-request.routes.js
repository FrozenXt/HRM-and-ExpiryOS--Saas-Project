// routes/leave-request.routes.js
const express = require("express");
const leaveRequestController = require("../controllers/leave-request.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     LeaveRequest:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 68ba1234567890abcdef1234 }
 *         employeeId: { type: string }
 *         leaveTypeId: { type: string }
 *         fromDate: { type: string, format: date }
 *         toDate: { type: string, format: date }
 *         reason: { type: string }
 *         status: { type: string, enum: [pending, approved, rejected] }
 */

/**
 * @openapi
 * /api/v1/leave-requests/list:
 *   post:
 *     summary: Get leave requests
 *     description: Paginated, filtered list. Staff see only their own requests.
 *     tags: [LeaveRequests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 20 }
 *               sort: { type: string, enum: [ASC, DESC] }
 *               sort_field: { type: string, example: createdAt }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     operator: { type: string, enum: [eq, ne, gt, gte, lt, lte, contains, starts_with, ends_with, in] }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Leave requests fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 */
router.post(
  "/list",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveRequestController.index,
);

/**
 * @openapi
 * /api/v1/leave-requests:
 *   post:
 *     summary: Create a leave request
 *     description: Staff create for themselves; Admin/HR may create on behalf of an employee via employeeId.
 *     tags: [LeaveRequests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leaveTypeId, fromDate, toDate]
 *             properties:
 *               employeeId: { type: string, description: "Admin/HR only" }
 *               leaveTypeId: { type: string }
 *               fromDate: { type: string, format: date }
 *               toDate: { type: string, format: date }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Leave request created successfully }
 *       400: { description: Invalid date range }
 *       401: { description: Authentication required or invalid access token }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveRequestController.store,
);

/**
 * @openapi
 * /api/v1/leave-requests/{id}/status:
 *   patch:
 *     summary: Approve or reject a leave request
 *     description: Admin/HR only. On approval, LeaveBalance.used is incremented automatically.
 *     tags: [LeaveRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approved]
 *             properties:
 *               approved: { type: boolean, example: true }
 *     responses:
 *       200: { description: Leave request status updated }
 *       400: { description: Leave request has already been decided }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Leave request not found }
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "hr"),
  leaveRequestController.setStatus,
);

/**
 * @openapi
 * /api/v1/leave-requests/{id}:
 *   get:
 *     summary: Get a leave request by ID
 *     tags: [LeaveRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Leave request fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: Leave request not found }
 *   put:
 *     summary: Update a leave request
 *     description: Staff may edit only while status is pending.
 *     tags: [LeaveRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leaveTypeId: { type: string }
 *               fromDate: { type: string, format: date }
 *               toDate: { type: string, format: date }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Leave request updated successfully }
 *       400: { description: Only pending leave requests can be edited }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: Leave request not found }
 *   delete:
 *     summary: Cancel/delete a leave request
 *     description: Staff may cancel only while status is pending.
 *     tags: [LeaveRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Leave request deleted successfully }
 *       400: { description: Only pending leave requests can be cancelled }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: Leave request not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveRequestController.show,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveRequestController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveRequestController.destroy,
);

module.exports = router;

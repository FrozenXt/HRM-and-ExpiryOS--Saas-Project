// routes/leave-balance.routes.js
const express = require("express");
const leaveBalanceController = require("../controllers/leave-balance.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     LeaveBalance:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 68ba1234567890abcdef1234 }
 *         employeeId: { type: string }
 *         leaveTypeId: { type: string }
 *         year: { type: integer, example: 2026 }
 *         used: { type: number, example: 3 }
 *         remaining: { type: number, example: 9 }
 */

/**
 * @openapi
 * /api/v1/leave-balances/list:
 *   post:
 *     summary: Get leave balances
 *     description: Staff see only their own balances.
 *     tags: [LeaveBalances]
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
 *               sort_field: { type: string, example: year }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     operator: { type: string, enum: [eq, ne, gt, gte, lt, lte, contains, starts_with, ends_with, in] }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Leave balances fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 */
router.post(
  "/list",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveBalanceController.index,
);

/**
 * @openapi
 * /api/v1/leave-balances:
 *   post:
 *     summary: Create a leave balance record
 *     description: Admin/HR only — typically seeded when a leave type is assigned to an employee.
 *     tags: [LeaveBalances]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, leaveTypeId, year, remaining]
 *             properties:
 *               employeeId: { type: string }
 *               leaveTypeId: { type: string }
 *               year: { type: integer, example: 2026 }
 *               remaining: { type: number, example: 12 }
 *     responses:
 *       201: { description: Leave balance created successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr"),
  leaveBalanceController.store,
);

/**
 * @openapi
 * /api/v1/leave-balances/{id}:
 *   get:
 *     summary: Get a leave balance by ID
 *     tags: [LeaveBalances]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Leave balance fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: Leave balance not found }
 *   put:
 *     summary: Adjust a leave balance
 *     description: Admin/HR only.
 *     tags: [LeaveBalances]
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
 *               used: { type: number }
 *               remaining: { type: number }
 *     responses:
 *       200: { description: Leave balance updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Leave balance not found }
 *   delete:
 *     summary: Delete a leave balance record
 *     tags: [LeaveBalances]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Leave balance deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Leave balance not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("admin", "hr", "staff"),
  leaveBalanceController.show,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "hr"),
  leaveBalanceController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "hr"),
  leaveBalanceController.destroy,
);

module.exports = router;

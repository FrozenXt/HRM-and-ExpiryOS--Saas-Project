const express = require("express");
const activityLogController = require("../controllers/activity-log.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ActivityLog:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         sessionId: { type: string }
 *         timestamp: { type: string, format: date-time }
 *         activityLevel: { type: string, enum: [active, idle] }
 *         keystrokeCount: { type: number, nullable: true }
 *         mouseEventCount: { type: number, nullable: true }
 *         activeAppName: { type: string, nullable: true }
 *         activeWindowTitle: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/activity-logs/list:
 *   post:
 *     summary: Get activity logs
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Activity Logs]
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
 *               sort_field: { type: string, example: timestamp }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: activityLevel }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: idle }
 *     responses:
 *       200: { description: Activity logs fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  activityLogController.index,
);

/**
 * @openapi
 * /api/v1/activity-logs:
 *   post:
 *     summary: Ingest activity log entries (single or batch)
 *     description: >
 *       Sent by the employee's own device agent. Always recorded against the
 *       caller's own employee profile, and rejected with 403 unless their latest
 *       monitoring consent is "given". Send either a single entry's fields, or
 *       { entries: [...] } with up to 500 entries.
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entries:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required: [sessionId, activityLevel]
 *                   properties:
 *                     sessionId: { type: string }
 *                     timestamp: { type: string, format: date-time }
 *                     activityLevel: { type: string, enum: [active, idle] }
 *                     keystrokeCount: { type: number }
 *                     mouseEventCount: { type: number }
 *                     activeAppName: { type: string }
 *                     activeWindowTitle: { type: string }
 *               sessionId: { type: string, description: "Single-entry form — use instead of entries" }
 *               timestamp: { type: string, format: date-time }
 *               activityLevel: { type: string, enum: [active, idle] }
 *               keystrokeCount: { type: number }
 *               mouseEventCount: { type: number }
 *               activeAppName: { type: string }
 *               activeWindowTitle: { type: string }
 *     responses:
 *       201: { description: Activity logged successfully }
 *       400: { description: Invalid entry, or no employee profile }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Monitoring consent has not been given }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr", "staff"),
  activityLogController.store,
);

/**
 * @openapi
 * /api/v1/activity-logs/{id}:
 *   get:
 *     summary: Get an activity log by ID
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Activity log fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Activity log not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  activityLogController.show,
);

module.exports = router;

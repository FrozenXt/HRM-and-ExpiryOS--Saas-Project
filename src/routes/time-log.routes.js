const express = require("express");
const timeLogController = require("../controllers/time-log.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     TimeLog:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         date: { type: string, format: date }
 *         hoursWorked: { type: number, example: 8 }
 *         overtimeHours: { type: number, nullable: true }
 *         taskDescription: { type: string, nullable: true }
 *         status: { type: string, enum: [draft, submitted, approved, rejected] }
 *         approvedBy: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/time-logs/list:
 *   post:
 *     summary: Get time logs
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Time Logs]
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
 *               sort_field: { type: string, example: date }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: status }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: submitted }
 *     responses:
 *       200: { description: Time logs fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  timeLogController.index,
);

/**
 * @openapi
 * /api/v1/time-logs:
 *   post:
 *     summary: Create a draft time log
 *     description: Staff always log against their own employeeId. Admin/HR/Super Admin must supply employeeId.
 *     tags: [Time Logs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, hoursWorked]
 *             properties:
 *               employeeId: { type: string, description: "Required unless caller is staff" }
 *               date: { type: string, format: date }
 *               hoursWorked: { type: number, example: 8 }
 *               overtimeHours: { type: number }
 *               taskDescription: { type: string }
 *     responses:
 *       201: { description: Time log created successfully }
 *       400: { description: Invalid data or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  timeLogController.store,
);

/**
 * @openapi
 * /api/v1/time-logs/{id}:
 *   get:
 *     summary: Get a time log by ID
 *     tags: [Time Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Time log fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Time log not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  timeLogController.show,
);

/**
 * @openapi
 * /api/v1/time-logs/{id}:
 *   put:
 *     summary: Edit a draft time log
 *     description: Only a still-draft log can be edited.
 *     tags: [Time Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date: { type: string, format: date }
 *               hoursWorked: { type: number }
 *               overtimeHours: { type: number }
 *               taskDescription: { type: string }
 *     responses:
 *       200: { description: Time log updated successfully }
 *       400: { description: Log is no longer a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Time log not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  timeLogController.update,
);

/**
 * @openapi
 * /api/v1/time-logs/{id}:
 *   delete:
 *     summary: Delete a draft time log
 *     description: Only a still-draft log can be deleted.
 *     tags: [Time Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Time log deleted successfully }
 *       400: { description: Log is no longer a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Time log not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  timeLogController.destroy,
);

/**
 * @openapi
 * /api/v1/time-logs/{id}/submit:
 *   post:
 *     summary: Submit a draft time log for approval
 *     tags: [Time Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Time log submitted successfully }
 *       400: { description: Log is not a draft }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Time log not found }
 */
router.post(
  "/:id/submit",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  timeLogController.submit,
);

/**
 * @openapi
 * /api/v1/time-logs/{id}/review:
 *   put:
 *     summary: Approve or reject a submitted time log
 *     description: Admin/HR/Super Admin only.
 *     tags: [Time Logs]
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
 *       200: { description: Time log reviewed successfully }
 *       400: { description: Invalid status, or log isn't submitted }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.put(
  "/:id/review",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  timeLogController.review,
);

module.exports = router;

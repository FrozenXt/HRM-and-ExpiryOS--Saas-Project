const express = require("express");

const expiryReminderLogController = require("../controllers/expiry-reminder-log.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ExpiryReminderLog:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         documentId: { type: string }
 *         companyId: { type: string }
 *         sentAt: { type: string, format: date-time }
 *         channel: { type: string, enum: [email, sms] }
 *         escalatedTo: { type: string, nullable: true }
 *         status: { type: string, enum: [sent, failed] }
 */

/**
 * @openapi
 * /api/v1/expiry-reminder-logs/list:
 *   post:
 *     summary: Get expiry reminder logs
 *     description: >
 *       Read-only audit trail — entries are written by the scheduled expiry
 *       sweep job, not through this API. Admin/HR are auto-scoped to their
 *       own company. Super Admin sees all.
 *     tags: [Expiry Reminder Logs]
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
 *                     field: { type: string, example: status }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: failed }
 *     responses:
 *       200: { description: Expiry reminder logs fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expiryReminderLogController.index,
);

/**
 * @openapi
 * /api/v1/expiry-reminder-logs/{id}:
 *   get:
 *     summary: Get an expiry reminder log by ID
 *     tags: [Expiry Reminder Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Expiry reminder log fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expiry reminder log not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expiryReminderLogController.show,
);

module.exports = router;

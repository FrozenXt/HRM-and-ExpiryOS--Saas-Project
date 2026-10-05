const express = require("express");

const auditLogController = require("../controllers/audit-log.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         companyId:
 *           type: string
 *           nullable: true
 *         action:
 *           type: string
 *           example: update
 *         entityType:
 *           type: string
 *           example: Company
 *         entityId:
 *           type: string
 *         before:
 *           type: object
 *         after:
 *           type: object
 *         ip:
 *           type: string
 *           example: 203.0.113.10
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/audit-logs/list:
 *   post:
 *     summary: Get audit logs
 *     description: >
 *       Admin/HR/Super Admin only — staff never see audit logs. Admin/HR see
 *       their own company's entries. Super Admin sees all, including
 *       company-less/global entries. Each row includes the acting user's
 *       name/email/role, the company, and the affected entity itself
 *       (dynamically populated from entityType/entityId).
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 example: 20
 *               sort:
 *                 type: string
 *                 enum: [ASC, DESC]
 *                 example: DESC
 *               sort_field:
 *                 type: string
 *                 example: createdAt
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: entityType
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: Payroll
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  auditLogController.index,
);

/**
 * @openapi
 * /api/v1/audit-logs:
 *   post:
 *     summary: Record an audit log entry
 *     description: >
 *       Admin/HR/Super Admin only. In practice most entries should come
 *       from auditLogService.record(...) called directly by the code
 *       performing the action, not this HTTP endpoint.
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, entityType, entityId]
 *             properties:
 *               action:
 *                 type: string
 *                 example: update
 *               entityType:
 *                 type: string
 *                 description: Must match a registered model name exactly.
 *                 example: Company
 *               entityId:
 *                 type: string
 *               before:
 *                 type: object
 *               after:
 *                 type: object
 *               ip:
 *                 type: string
 *     responses:
 *       201:
 *         description: Audit log recorded successfully
 *       400:
 *         description: Invalid data
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  auditLogController.create,
);

/**
 * @openapi
 * /api/v1/audit-logs/{id}:
 *   get:
 *     summary: Get an audit log by ID
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log fetched successfully
 *       404:
 *         description: Audit log not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  auditLogController.show,
);

module.exports = router;

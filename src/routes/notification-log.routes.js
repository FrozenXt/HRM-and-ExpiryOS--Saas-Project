const express = require("express");

const notificationLogController = require("../controllers/notification-log.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     NotificationLog:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         channel:
 *           type: string
 *           enum: [email, sms]
 *         templateCode:
 *           type: string
 *           example: leave_approved
 *         status:
 *           type: string
 *           enum: [sent, failed]
 *         sentAt:
 *           type: string
 *           format: date-time
 *         error:
 *           type: string
 */

/**
 * @openapi
 * /api/v1/notification-logs/list:
 *   post:
 *     summary: Get notification logs
 *     description: >
 *       Staff see only their own. Admin/HR see logs for every user in their
 *       company (NotificationLog has no companyId of its own, so this is
 *       resolved via the user's companyId). Super Admin sees all. Each row
 *       includes the user's name, email, role and company.
 *     tags:
 *       - Notification Logs
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
 *                 example: sentAt
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: status
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: failed
 *     responses:
 *       200:
 *         description: Notification logs fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, notificationLogController.index);

/**
 * @openapi
 * /api/v1/notification-logs:
 *   post:
 *     summary: Record a notification log entry
 *     description: >
 *       Admin/HR/Super Admin only, for manually recording a send that
 *       happened outside this system. Real sends from backend jobs should
 *       call notificationLogService.log(...) directly instead of this
 *       endpoint.
 *     tags:
 *       - Notification Logs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, channel, templateCode, status]
 *             properties:
 *               userId:
 *                 type: string
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *               templateCode:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [sent, failed]
 *               sentAt:
 *                 type: string
 *                 format: date-time
 *                 description: Defaults to now.
 *               error:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification log recorded successfully
 *       400:
 *         description: Invalid data
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  notificationLogController.create,
);

/**
 * @openapi
 * /api/v1/notification-logs/{id}:
 *   get:
 *     summary: Get a notification log by ID
 *     tags:
 *       - Notification Logs
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
 *         description: Notification log fetched successfully
 *       404:
 *         description: Notification log not found
 */
router.get("/:id", authenticate, notificationLogController.show);

/**
 * @openapi
 * /api/v1/notification-logs/{id}:
 *   delete:
 *     summary: Delete a notification log
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Notification Logs
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
 *         description: Notification log deleted successfully
 *       404:
 *         description: Notification log not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  notificationLogController.destroy,
);

module.exports = router;

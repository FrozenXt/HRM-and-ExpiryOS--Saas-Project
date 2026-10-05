const express = require("express");

const notificationTemplateController = require("../controllers/notification-template.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     NotificationTemplate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         code:
 *           type: string
 *           example: leave_approved
 *         channel:
 *           type: string
 *           enum: [email, sms]
 *         subject:
 *           type: string
 *           example: Your leave request was approved
 *         body:
 *           type: string
 *           example: Hi {{firstName}}, your leave from {{fromDate}} to {{toDate}} was approved.
 *         variables:
 *           type: array
 *           items:
 *             type: string
 *           example: [firstName, fromDate, toDate]
 */

/**
 * @openapi
 * /api/v1/notification-templates/list:
 *   post:
 *     summary: Get notification templates
 *     description: Platform-wide config. Super Admin only.
 *     tags:
 *       - Notification Templates
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
 *                 example: ASC
 *               sort_field:
 *                 type: string
 *                 example: code
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: channel
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: email
 *     responses:
 *       200:
 *         description: Notification templates fetched successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin"),
  notificationTemplateController.index,
);

/**
 * @openapi
 * /api/v1/notification-templates:
 *   post:
 *     summary: Create a notification template
 *     description: Super Admin only. code must be unique.
 *     tags:
 *       - Notification Templates
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, channel, body]
 *             properties:
 *               code:
 *                 type: string
 *                 example: leave_approved
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Notification template created successfully
 *       400:
 *         description: Invalid data, or a template with this code already exists
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  notificationTemplateController.create,
);

/**
 * @openapi
 * /api/v1/notification-templates/{id}:
 *   get:
 *     summary: Get a notification template by ID
 *     description: Super Admin only.
 *     tags:
 *       - Notification Templates
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
 *         description: Notification template fetched successfully
 *       404:
 *         description: Notification template not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin"),
  notificationTemplateController.show,
);

/**
 * @openapi
 * /api/v1/notification-templates/{id}:
 *   patch:
 *     summary: Update a notification template
 *     description: Super Admin only.
 *     tags:
 *       - Notification Templates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notification template updated successfully
 *       404:
 *         description: Notification template not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin"),
  notificationTemplateController.update,
);

/**
 * @openapi
 * /api/v1/notification-templates/{id}:
 *   delete:
 *     summary: Delete a notification template
 *     description: Super Admin only.
 *     tags:
 *       - Notification Templates
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
 *         description: Notification template deleted successfully
 *       404:
 *         description: Notification template not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  notificationTemplateController.destroy,
);

module.exports = router;

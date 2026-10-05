const express = require("express");

const deviceSessionController = require("../controllers/device-session.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     DeviceSession:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         employeeId:
 *           type: string
 *         companyId:
 *           type: string
 *         deviceId:
 *           type: string
 *           example: a1b2c3d4-device-uuid
 *         deviceType:
 *           type: string
 *           enum: [desktop, laptop, mobile]
 *         os:
 *           type: string
 *           example: Windows 11
 *         appVersion:
 *           type: string
 *           example: 1.4.2
 *         sessionStart:
 *           type: string
 *           format: date-time
 *         sessionEnd:
 *           type: string
 *           format: date-time
 *         ipAddress:
 *           type: string
 *           example: 203.0.113.10
 */

/**
 * @openapi
 * /api/v1/device-sessions/list:
 *   post:
 *     summary: Get device sessions
 *     description: >
 *       Staff see only their own. Admin/HR see the whole company. Super
 *       Admin sees all. Each row includes the employee (name, email,
 *       department, designation) and company (legal/trade name) — no
 *       follow-up calls needed.
 *     tags:
 *       - Device Sessions
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
 *                 example: sessionStart
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: deviceType
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: laptop
 *     responses:
 *       200:
 *         description: Device sessions fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, deviceSessionController.index);

/**
 * @openapi
 * /api/v1/device-sessions:
 *   post:
 *     summary: Start a device session
 *     description: >
 *       Called by the employee's own app. employeeId/companyId are taken
 *       from the token; any values in the body are ignored.
 *     tags:
 *       - Device Sessions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceId, deviceType]
 *             properties:
 *               deviceId:
 *                 type: string
 *               deviceType:
 *                 type: string
 *                 enum: [desktop, laptop, mobile]
 *               os:
 *                 type: string
 *               appVersion:
 *                 type: string
 *               ipAddress:
 *                 type: string
 *               sessionStart:
 *                 type: string
 *                 format: date-time
 *                 description: Defaults to now.
 *     responses:
 *       201:
 *         description: Device session created successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: No employee profile linked to this user
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  deviceSessionController.create,
);

/**
 * @openapi
 * /api/v1/device-sessions/{id}:
 *   get:
 *     summary: Get a device session by ID
 *     tags:
 *       - Device Sessions
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
 *         description: Device session fetched successfully
 *       404:
 *         description: Device session not found
 */
router.get("/:id", authenticate, deviceSessionController.show);

/**
 * @openapi
 * /api/v1/device-sessions/{id}:
 *   patch:
 *     summary: Update your own device session
 *     description: >
 *       Owner only — typically to close it by setting sessionEnd. Only
 *       sessionEnd, appVersion and ipAddress can change.
 *     tags:
 *       - Device Sessions
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
 *               sessionEnd:
 *                 type: string
 *                 format: date-time
 *               appVersion:
 *                 type: string
 *               ipAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device session updated successfully
 *       404:
 *         description: Device session not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  deviceSessionController.update,
);

/**
 * @openapi
 * /api/v1/device-sessions/{id}:
 *   delete:
 *     summary: Delete a device session
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Device Sessions
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
 *         description: Device session deleted successfully
 *       404:
 *         description: Device session not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  deviceSessionController.destroy,
);

module.exports = router;

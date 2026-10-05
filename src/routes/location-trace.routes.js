const express = require("express");

const locationTraceController = require("../controllers/location-trace.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     LocationTrace:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         employeeId:
 *           type: string
 *         companyId:
 *           type: string
 *         sessionId:
 *           type: string
 *         latitude:
 *           type: number
 *           example: 27.7172
 *         longitude:
 *           type: number
 *           example: 85.3240
 *         accuracyMeters:
 *           type: number
 *           example: 12.5
 *         capturedAt:
 *           type: string
 *           format: date-time
 *         deviceId:
 *           type: string
 *         source:
 *           type: string
 *           enum: [mobile_app, desktop_app, check_in]
 */

/**
 * @openapi
 * /api/v1/location-traces/list:
 *   post:
 *     summary: Get location traces
 *     description: >
 *       Staff see only their own. Admin/HR see the whole company. Super
 *       Admin sees all. Each row includes the employee (name, email,
 *       department, designation), company (legal/trade name) and the linked
 *       device session (device, OS, app version, session times, IP) — no
 *       follow-up calls needed.
 *     tags:
 *       - Location Traces
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
 *                 example: capturedAt
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: source
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: mobile_app
 *     responses:
 *       200:
 *         description: Location traces fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, locationTraceController.index);

/**
 * @openapi
 * /api/v1/location-traces:
 *   post:
 *     summary: Record a location point
 *     description: >
 *       Called by the employee's own app. employeeId/companyId come from
 *       the token; body values are ignored. If sessionId is given it must
 *       be one of the caller's own device sessions. Traces are append-only
 *       — there is no update endpoint.
 *     tags:
 *       - Location Traces
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, source]
 *             properties:
 *               sessionId:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               accuracyMeters:
 *                 type: number
 *               capturedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Defaults to now.
 *               deviceId:
 *                 type: string
 *               source:
 *                 type: string
 *                 enum: [mobile_app, desktop_app, check_in]
 *     responses:
 *       201:
 *         description: Location trace recorded successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: No employee profile linked to this user
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  locationTraceController.create,
);

/**
 * @openapi
 * /api/v1/location-traces/{id}:
 *   get:
 *     summary: Get a location trace by ID
 *     tags:
 *       - Location Traces
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
 *         description: Location trace fetched successfully
 *       404:
 *         description: Location trace not found
 */
router.get("/:id", authenticate, locationTraceController.show);

/**
 * @openapi
 * /api/v1/location-traces/{id}:
 *   delete:
 *     summary: Delete a location trace
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Location Traces
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
 *         description: Location trace deleted successfully
 *       404:
 *         description: Location trace not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  locationTraceController.destroy,
);

module.exports = router;
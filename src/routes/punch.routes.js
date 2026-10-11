// routes/punch.routes.js
const express = require("express");
const punchController = require("../controllers/punch.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     PunchLog:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 68ba1234567890abcdef1234 }
 *         id_int: { type: number, example: 101 }
 *         companyId: { type: string }
 *         employeeId: { type: string }
 *         userId: { type: string }
 *         punchedAt: { type: string, format: date-time }
 *         type: { type: string, enum: [in, out] }
 *         source: { type: string, enum: [kiosk, mobile, web, biometric, simulator] }
 *         deviceId: { type: string, nullable: true }
 *         location:
 *           type: object
 *           nullable: true
 *           properties:
 *             latitude: { type: number }
 *             longitude: { type: number }
 *         result: { type: string, enum: [accepted, rejected] }
 *         rejectionReason: { type: string, nullable: true }
 *         pinVerified: { type: boolean }
 *         attendanceId: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     PunchResult:
 *       type: object
 *       properties:
 *         employee:
 *           type: object
 *           properties:
 *             _id: { type: string }
 *             name: { type: string, example: Ram Sharma }
 *             profileImage: { type: string, nullable: true }
 *         type: { type: string, enum: [in, out] }
 *         punchedAt: { type: string, format: date-time }
 *         status: { type: string, enum: [present, absent, late, half_day] }
 *         attendanceId: { type: string }
 */

/**
 * @openapi
 * /api/v1/punch:
 *   post:
 *     summary: Kiosk punch (public)
 *     description: |
 *       Unauthenticated kiosk endpoint. The employee identifies themselves
 *       with `employeeId` + a 4-digit `pin`. The request is then passed to
 *       the same attendance service used by JWT-authenticated check-in/out,
 *       so shift rules, geofencing, late classification, and notifications
 *       apply identically.
 *
 *       Every attempt — accepted or rejected — is written to `PunchLog`.
 *     tags: [Punch]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, pin, type]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               pin:
 *                 type: string
 *                 example: "1234"
 *                 description: 4-digit numeric PIN
 *               type:
 *                 type: string
 *                 enum: [in, out]
 *               deviceId:
 *                 type: string
 *                 nullable: true
 *                 example: main-gate-tablet
 *               location:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   latitude: { type: number, example: 27.7172 }
 *                   longitude: { type: number, example: 85.3240 }
 *     responses:
 *       200:
 *         description: Punch accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Checked in successfully }
 *                 data: { $ref: '#/components/schemas/PunchResult' }
 *       400:
 *         description: Missing fields, holiday, not a working day, already checked in/out, or no PIN set
 *       401:
 *         description: Invalid PIN
 *       403:
 *         description: Employee account is not active
 *       404:
 *         description: Employee not found or no user account linked
 */
router.post("/", punchController.punch);

/**
 * @openapi
 * /api/v1/punch/recent:
 *   get:
 *     summary: Recent punches for the company
 *     description: Admin/HR only. Newest first. Backs the live kiosk board and audit view.
 *     tags: [Punch]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - name: since
 *         in: query
 *         description: ISO date — only return punches at or after this time
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Recent punches fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Recent punches fetched }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PunchLog' }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.get(
  "/recent",
  authenticate,
  authorize("admin", "hr"),
  punchController.recent,
);

/**
 * @openapi
 * /api/v1/punch/employee/{employeeId}:
 *   get:
 *     summary: Punch history for one employee
 *     description: Admin/HR can view any employee in their company. Staff can view only their own.
 *     tags: [Punch]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: employeeId
 *         in: path
 *         required: true
 *         schema: { type: string, example: 68ba1234567890abcdef1234 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 100, maximum: 500 }
 *       - name: since
 *         in: query
 *         description: ISO date — only return punches at or after this time
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Punch history fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Punch history fetched }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PunchLog' }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.get(
  "/employee/:employeeId",
  authenticate,
  authorize("admin", "hr", "staff"),
  punchController.employeeHistory,
);

module.exports = router;

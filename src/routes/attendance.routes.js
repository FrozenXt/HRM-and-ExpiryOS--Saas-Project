// routes/attendance.routes.js
const express = require("express");
const attendanceController = require("../controllers/attendance.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 68ba1234567890abcdef1234 }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         date: { type: string, format: date }
 *         checkIn: { type: string, format: date-time }
 *         checkOut: { type: string, format: date-time }
 *         status: { type: string, enum: [present, absent, late, half_day] }
 */

/**
 * @openapi
 * /api/v1/attendance/list:
 *   post:
 *     summary: Get attendance records
 *     description: Paginated, filtered attendance list. Staff see only their own records.
 *     tags: [Attendance]
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
 *               sort_field: { type: string, example: date }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     operator: { type: string, enum: [eq, ne, gt, gte, lt, lte, contains, starts_with, ends_with, in] }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Attendance records fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("admin", "hr", "staff"),
  attendanceController.index,
);

/**
 * @openapi
 * /api/v1/attendance/check-in:
 *   post:
 *     summary: Check in for today
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *     responses:
 *       200: { description: Checked in successfully }
 *       400: { description: Already checked in today }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: No employee profile linked to this user }
 */
router.post(
  "/check-in",
  authenticate,
  authorize("admin", "hr", "staff"),
  attendanceController.checkIn,
);

/**
 * @openapi
 * /api/v1/attendance/check-out:
 *   post:
 *     summary: Check out for today
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *     responses:
 *       200: { description: Checked out successfully }
 *       400: { description: Must check in first, or already checked out }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: No employee profile linked to this user }
 */
router.post(
  "/check-out",
  authenticate,
  authorize("admin", "hr", "staff"),
  attendanceController.checkOut,
);

/**
 * @openapi
 * /api/v1/attendance/{id}:
 *   get:
 *     summary: Get an attendance record by ID
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: 68ba1234567890abcdef1234 }
 *     responses:
 *       200: { description: Attendance fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: Attendance record not found }
 *   put:
 *     summary: Correct an attendance record
 *     description: Admin/HR only — manual corrections.
 *     tags: [Attendance]
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
 *               checkIn: { type: string, format: date-time }
 *               checkOut: { type: string, format: date-time }
 *               status: { type: string, enum: [present, absent, late, half_day] }
 *     responses:
 *       200: { description: Attendance updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Attendance record not found }
 *   delete:
 *     summary: Delete an attendance record
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Attendance deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Attendance record not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("admin", "hr", "staff"),
  attendanceController.show,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "hr"),
  attendanceController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "hr"),
  attendanceController.destroy,
);

/**
 * @openapi
 * /api/v1/attendance:
 *   post:
 *     summary: Manually create an attendance record
 *     description: Admin/HR only — e.g. backfilling a missed punch.
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, date, status]
 *             properties:
 *               employeeId: { type: string }
 *               date: { type: string, format: date }
 *               checkIn: { type: string, format: date-time }
 *               checkOut: { type: string, format: date-time }
 *               status: { type: string, enum: [present, absent, late, half_day] }
 *     responses:
 *       201: { description: Attendance created successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr"),
  attendanceController.store,
);

module.exports = router;

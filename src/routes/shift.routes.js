const express = require("express");

const shiftController = require("../controllers/shift.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Shift:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         companyId:
 *           type: string
 *           description: Company MongoDB ObjectId
 *           example: 68ba1234567890abcdef1234
 *         name:
 *           type: string
 *           description: Name of the shift
 *           example: Morning Shift
 *         startTime:
 *           type: string
 *           description: Shift start time in HH:mm format
 *           pattern: '^([01]\d|2[0-3]):[0-5]\d$'
 *           example: "09:00"
 *         endTime:
 *           type: string
 *           description: Shift end time in HH:mm format. If earlier than startTime, the shift is treated as overnight.
 *           pattern: '^([01]\d|2[0-3]):[0-5]\d$'
 *           example: "18:00"
 *         breakMinutes:
 *           type: integer
 *           minimum: 0
 *           maximum: 600
 *           description: Break duration in minutes
 *           example: 60
 *         graceMinutes:
 *           type: integer
 *           nullable: true
 *           minimum: 0
 *           maximum: 240
 *           description: Grace period in minutes. Null means the company's lateMarkGraceMinutes is used.
 *           example: 15
 *         color:
 *           type: string
 *           description: Shift display color in hexadecimal format
 *           pattern: '^#[0-9a-fA-F]{6}$'
 *           example: "#3b82f6"
 *         isActive:
 *           type: boolean
 *           description: Whether the shift is active
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/shifts/list:
 *   post:
 *     summary: Get shifts
 *     description: Get a paginated and filtered list of shifts for the logged-in user's company.
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *
 *               sort:
 *                 type: string
 *                 enum:
 *                   - ASC
 *                   - DESC
 *                 example: DESC
 *
 *               sort_field:
 *                 type: string
 *                 example: createdAt
 *
 *               fields:
 *                 type: array
 *                 description: List of filters to apply.
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: name
 *
 *                     operator:
 *                       type: string
 *                       enum:
 *                         - eq
 *                         - ne
 *                         - gt
 *                         - gte
 *                         - lt
 *                         - lte
 *                         - contains
 *                         - starts_with
 *                         - ends_with
 *                         - in
 *                       example: contains
 *
 *                     value:
 *                       type: string
 *                       example: Morning
 *
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: DESC
 *             sort_field: createdAt
 *             fields:
 *               - field: isActive
 *                 operator: eq
 *                 value: true
 *
 *     responses:
 *       200:
 *         description: Shifts fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  shiftController.index,
);

/**
 * @openapi
 * /api/v1/shifts/{id}:
 *   get:
 *     summary: Get a shift by ID
 *     description: Get a single shift by its ID. The shift must belong to the logged-in user's company.
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Shift MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Shift fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Shift not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  shiftController.show,
);

/**
 * @openapi
 * /api/v1/shifts:
 *   post:
 *     summary: Create a new shift
 *     description: Create a new shift for the logged-in user's company.
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startTime
 *               - endTime
 *             properties:
 *               name:
 *                 type: string
 *                 example: Morning Shift
 *
 *               startTime:
 *                 type: string
 *                 description: Shift start time in HH:mm format
 *                 pattern: '^([01]\d|2[0-3]):[0-5]\d$'
 *                 example: "09:00"
 *
 *               endTime:
 *                 type: string
 *                 description: Shift end time in HH:mm format. If earlier than startTime, the shift is treated as overnight.
 *                 pattern: '^([01]\d|2[0-3]):[0-5]\d$'
 *                 example: "18:00"
 *
 *               breakMinutes:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *                 default: 0
 *                 example: 60
 *
 *               graceMinutes:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 0
 *                 maximum: 240
 *                 description: Null means the company's lateMarkGraceMinutes is used.
 *                 example: 15
 *
 *               color:
 *                 type: string
 *                 description: Shift display color in hexadecimal format
 *                 pattern: '^#[0-9a-fA-F]{6}$'
 *                 default: "#3b82f6"
 *                 example: "#3b82f6"
 *
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *
 *           example:
 *             name: Morning Shift
 *             startTime: "09:00"
 *             endTime: "18:00"
 *             breakMinutes: 60
 *             graceMinutes: 15
 *             color: "#3b82f6"
 *             isActive: true
 *
 *     responses:
 *       201:
 *         description: Shift created successfully
 *
 *       400:
 *         description: Invalid shift data or duplicate shift name
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  shiftController.store,
);

/**
 * @openapi
 * /api/v1/shifts/{id}:
 *   patch:
 *     summary: Update a shift
 *     description: Update an existing shift belonging to the logged-in user's company.
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Shift MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Evening Shift
 *
 *               startTime:
 *                 type: string
 *                 description: Shift start time in HH:mm format
 *                 pattern: '^([01]\d|2[0-3]):[0-5]\d$'
 *                 example: "14:00"
 *
 *               endTime:
 *                 type: string
 *                 description: Shift end time in HH:mm format
 *                 pattern: '^([01]\d|2[0-3]):[0-5]\d$'
 *                 example: "22:00"
 *
 *               breakMinutes:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 600
 *                 example: 60
 *
 *               graceMinutes:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 0
 *                 maximum: 240
 *                 description: Null means the company's lateMarkGraceMinutes is used.
 *                 example: 15
 *
 *               color:
 *                 type: string
 *                 description: Shift display color in hexadecimal format
 *                 pattern: '^#[0-9a-fA-F]{6}$'
 *                 example: "#22c55e"
 *
 *               isActive:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       200:
 *         description: Shift updated successfully
 *
 *       400:
 *         description: Invalid shift data or duplicate shift name
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Shift not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  shiftController.update,
);

/**
 * @openapi
 * /api/v1/shifts/{id}:
 *   delete:
 *     summary: Delete a shift
 *     description: Delete a shift by its ID. The shift must belong to the logged-in user's company.
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Shift MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Shift deleted successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Shift not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  shiftController.destroy,
);

module.exports = router;

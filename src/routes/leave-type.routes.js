const express = require("express");

const leaveTypeController = require("../controllers/leave-type.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     LeaveType:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         name: { type: string, example: "Sick Leave" }
 *         annualQuota: { type: number, example: 12 }
 *         carryForward: { type: boolean, example: false }
 */

/**
 * @openapi
 * /api/v1/leave-types/list:
 *   post:
 *     summary: Get leave types
 *     description: Admin/HR are auto-scoped to their own company. Super Admin sees all.
 *     tags: [Leave Types]
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
 *               sort_field: { type: string }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     operator: { type: string }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Leave types fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  leaveTypeController.index,
);

/**
 * @openapi
 * /api/v1/leave-types:
 *   post:
 *     summary: Create a leave type
 *     description: Admin/HR create under their own company; companyId is ignored for them. Super Admin must supply companyId.
 *     tags: [Leave Types]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, annualQuota]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               name: { type: string, example: "Sick Leave" }
 *               annualQuota: { type: number, example: 12 }
 *               carryForward: { type: boolean, default: false }
 *     responses:
 *       201: { description: LeaveType created successfully }
 *       400: { description: Invalid data or duplicate value in this company }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  leaveTypeController.store,
);

/**
 * @openapi
 * /api/v1/leave-types/{id}:
 *   get:
 *     summary: Get a leave type by ID
 *     tags: [Leave Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: LeaveType fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: LeaveType not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  leaveTypeController.show,
);

/**
 * @openapi
 * /api/v1/leave-types/{id}:
 *   put:
 *     summary: Update a leave type
 *     tags: [Leave Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               annualQuota: { type: number }
 *               carryForward: { type: boolean }
 *     responses:
 *       200: { description: LeaveType updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: LeaveType not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  leaveTypeController.update,
);

/**
 * @openapi
 * /api/v1/leave-types/{id}:
 *   delete:
 *     summary: Delete a leave type
 *     tags: [Leave Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: LeaveType deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: LeaveType not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  leaveTypeController.destroy,
);

module.exports = router;

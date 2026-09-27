const express = require("express");
const assetAssignmentController = require("../controllers/asset-assignment.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     AssetAssignment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         assetId: { type: object, description: "Populated asset details" }
 *         employeeId: { type: object, description: "Populated employee + user + department + designation" }
 *         companyId: { type: object }
 *         assignedDate: { type: string, format: date-time }
 *         returnedDate: { type: string, format: date-time, nullable: true }
 *         condition: { type: string, enum: [good, damaged, lost], nullable: true }
 *         assignedBy: { type: object, description: "Populated user who made the assignment" }
 */

/**
 * @openapi
 * /api/v1/asset-assignments/list:
 *   post:
 *     summary: Get asset assignments
 *     description: >
 *       Staff see only their own. Admin/HR see the whole company. Super
 *       Admin sees all. Every record is fully populated (asset, employee,
 *       assignedBy, company) — no separate lookups needed.
 *     tags: [Asset Assignments]
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
 *                     field: { type: string, example: returnedDate }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Asset assignments fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  assetAssignmentController.index,
);

/**
 * @openapi
 * /api/v1/asset-assignments:
 *   post:
 *     summary: Assign an asset to an employee
 *     description: >
 *       Admin/HR/Super Admin only. The asset must currently be "available".
 *       On success, the asset's status flips to "assigned".
 *     tags: [Asset Assignments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, employeeId, assignedDate]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               assetId: { type: string }
 *               employeeId: { type: string }
 *               assignedDate: { type: string, format: date }
 *     responses:
 *       201: { description: Asset assigned successfully }
 *       400: { description: Asset not available, already assigned, or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetAssignmentController.store,
);

/**
 * @openapi
 * /api/v1/asset-assignments/{id}:
 *   get:
 *     summary: Get an asset assignment by ID
 *     tags: [Asset Assignments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset assignment fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset assignment not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  assetAssignmentController.show,
);

/**
 * @openapi
 * /api/v1/asset-assignments/{id}:
 *   put:
 *     summary: Edit an asset assignment
 *     description: Only assignedDate/condition notes are editable — reassigning is a new record. Admin/HR/Super Admin only.
 *     tags: [Asset Assignments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedDate: { type: string, format: date }
 *     responses:
 *       200: { description: Asset assignment updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset assignment not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetAssignmentController.update,
);

/**
 * @openapi
 * /api/v1/asset-assignments/{id}:
 *   delete:
 *     summary: Delete an asset assignment record
 *     description: If the assignment was still active (unreturned), the asset is freed back to "available". Admin/HR/Super Admin only.
 *     tags: [Asset Assignments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset assignment deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset assignment not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetAssignmentController.destroy,
);

/**
 * @openapi
 * /api/v1/asset-assignments/{id}/return:
 *   post:
 *     summary: Mark an asset as returned
 *     description: >
 *       Admin/HR/Super Admin only. Sets returnedDate and condition; puts the
 *       asset back to "available" (condition: good) or "under_repair"
 *       (condition: damaged/lost).
 *     tags: [Asset Assignments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               returnedDate: { type: string, format: date }
 *               condition: { type: string, enum: [good, damaged, lost], default: good }
 *     responses:
 *       200: { description: Asset marked as returned }
 *       400: { description: Already returned }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset assignment not found }
 */
router.post(
  "/:id/return",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetAssignmentController.returnAsset,
);

module.exports = router;

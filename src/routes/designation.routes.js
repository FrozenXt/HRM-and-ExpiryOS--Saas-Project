const express = require("express");

const designationController = require("../controllers/designation.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Designation:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         name: { type: string, example: "Software Engineer" }
 *         departmentId: { type: string }
 */

/**
 * @openapi
 * /api/v1/designations/list:
 *   post:
 *     summary: Get designations
 *     description: Admin/HR are auto-scoped to their own company. Super Admin sees all.
 *     tags: [Designations]
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
 *       200: { description: Designations fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  designationController.index,
);

/**
 * @openapi
 * /api/v1/designations:
 *   post:
 *     summary: Create a designation
 *     description: Admin/HR create under their own company; companyId is ignored for them. Super Admin must supply companyId.
 *     tags: [Designations]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, departmentId]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               name: { type: string, example: "Software Engineer" }
 *               departmentId: { type: string }
 *     responses:
 *       201: { description: Designation created successfully }
 *       400: { description: Invalid data or duplicate value in this company }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  designationController.store,
);

/**
 * @openapi
 * /api/v1/designations/{id}:
 *   get:
 *     summary: Get a designation by ID
 *     tags: [Designations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Designation fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Designation not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  designationController.show,
);

/**
 * @openapi
 * /api/v1/designations/{id}:
 *   put:
 *     summary: Update a designation
 *     tags: [Designations]
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
 *               departmentId: { type: string }
 *     responses:
 *       200: { description: Designation updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Designation not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  designationController.update,
);

/**
 * @openapi
 * /api/v1/designations/{id}:
 *   delete:
 *     summary: Delete a designation
 *     tags: [Designations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Designation deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Designation not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  designationController.destroy,
);

module.exports = router;

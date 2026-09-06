const express = require("express");

const documentTypeController = require("../controllers/document-type.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     DocumentType:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         name: { type: string, example: "Passport" }
 *         defaultReminderOffsetsDays:
 *           type: array
 *           items: { type: number }
 *           example: [90, 60, 30, 7, 0]
 */

/**
 * @openapi
 * /api/v1/document-types/list:
 *   post:
 *     summary: Get document types
 *     description: Admin/HR are auto-scoped to their own company. Super Admin sees all.
 *     tags: [Document Types]
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
 *       200: { description: Document types fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  documentTypeController.index,
);

/**
 * @openapi
 * /api/v1/document-types:
 *   post:
 *     summary: Create a document type
 *     description: Admin/HR create under their own company; companyId is ignored for them. Super Admin must supply companyId.
 *     tags: [Document Types]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, defaultReminderOffsetsDays]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               name: { type: string, example: "Passport" }
 *               defaultReminderOffsetsDays:
 *                 type: array
 *                 items: { type: number }
 *                 example: [90, 60, 30, 7, 0]
 *     responses:
 *       201: { description: DocumentType created successfully }
 *       400: { description: Invalid data or duplicate value in this company }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  documentTypeController.store,
);

/**
 * @openapi
 * /api/v1/document-types/{id}:
 *   get:
 *     summary: Get a document type by ID
 *     tags: [Document Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: DocumentType fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: DocumentType not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  documentTypeController.show,
);

/**
 * @openapi
 * /api/v1/document-types/{id}:
 *   put:
 *     summary: Update a document type
 *     tags: [Document Types]
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
 *               defaultReminderOffsetsDays:
 *                 type: array
 *                 items: { type: number }
 *     responses:
 *       200: { description: DocumentType updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: DocumentType not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  documentTypeController.update,
);

/**
 * @openapi
 * /api/v1/document-types/{id}:
 *   delete:
 *     summary: Delete a document type
 *     tags: [Document Types]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: DocumentType deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: DocumentType not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  documentTypeController.destroy,
);

module.exports = router;

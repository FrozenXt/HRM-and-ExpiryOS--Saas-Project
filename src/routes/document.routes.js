const express = require("express");

const documentController = require("../controllers/document.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Document:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         documentTypeId: { type: string }
 *         fileUrl: { type: string }
 *         fileName: { type: string }
 *         version: { type: number, example: 1 }
 *         expiryDate: { type: string, format: date }
 *         uploadedBy: { type: string }
 *         status: { type: string, enum: [valid, expiring, expired] }
 *         previousVersionId: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/documents/list:
 *   post:
 *     summary: Get documents
 *     description: >
 *       Staff see only their own documents. Admin/HR see the whole company.
 *       Super Admin sees everything.
 *     tags: [Documents]
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
 *                     field: { type: string, example: status }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: expiring }
 *     responses:
 *       200: { description: Documents fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  documentController.index,
);

/**
 * @openapi
 * /api/v1/documents:
 *   post:
 *     summary: Upload a new document
 *     description: >
 *       Staff always upload against their own employeeId — any employeeId
 *       sent in the body is ignored for them. Admin/HR/Super Admin must
 *       supply employeeId.
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentTypeId, fileUrl, fileName, expiryDate]
 *             properties:
 *               employeeId: { type: string, description: "Required unless caller is staff" }
 *               documentTypeId: { type: string }
 *               fileUrl: { type: string }
 *               fileName: { type: string }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       201: { description: Document uploaded successfully }
 *       400: { description: Invalid data or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  documentController.store,
);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Get a document by ID
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Document fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Document not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  documentController.show,
);

/**
 * @openapi
 * /api/v1/documents/{id}/reupload:
 *   post:
 *     summary: Upload a replacement version of a document
 *     description: >
 *       Creates a new document row (version + 1) linked back to this one via
 *       previousVersionId, rather than overwriting it — so compliance
 *       history is preserved.
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileUrl: { type: string }
 *               fileName: { type: string }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       201: { description: New document version uploaded successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Document not found }
 */
router.post(
  "/:id/reupload",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  documentController.reupload,
);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   delete:
 *     summary: Delete a document
 *     description: Admin/HR/Super Admin only — staff cannot delete their own compliance documents.
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Document deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Document not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  documentController.destroy,
);

module.exports = router;

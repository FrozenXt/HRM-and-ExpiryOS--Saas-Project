const express = require("express");
const receiptController = require("../controllers/receipt.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  buildUploader,
  handleUploadErrors,
} = require("../middlewares/upload.middleware");

const uploadReceipt = handleUploadErrors(
  buildUploader("receipts").single("file"),
);

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Receipt:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         expenseClaimId: { type: string }
 *         companyId: { type: string }
 *         employeeId: { type: string }
 *         fileUrl: { type: string }
 *         fileName: { type: string }
 *         mimeType: { type: string }
 *         sizeBytes: { type: number }
 *         uploadedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /api/v1/receipts/list:
 *   post:
 *     summary: Get receipts
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Receipts]
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
 *                     field: { type: string, example: expenseClaimId }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Receipts fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  receiptController.index,
);

/**
 * @openapi
 * /api/v1/receipts:
 *   post:
 *     summary: Upload a receipt for an expense claim
 *     tags: [Receipts]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [expenseClaimId, file]
 *             properties:
 *               expenseClaimId: { type: string }
 *               file: { type: string, format: binary, description: "PDF, PNG, JPEG, or WEBP, max 10 MB." }
 *     responses:
 *       201: { description: Receipt uploaded successfully }
 *       400: { description: Missing file, or claim doesn't belong to you }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  uploadReceipt,
  receiptController.store,
);

/**
 * @openapi
 * /api/v1/receipts/{id}:
 *   get:
 *     summary: Get a receipt by ID
 *     tags: [Receipts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Receipt fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Receipt not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  receiptController.show,
);

/**
 * @openapi
 * /api/v1/receipts/{id}:
 *   delete:
 *     summary: Delete a receipt
 *     description: Only allowed while the parent expense claim is still draft or submitted.
 *     tags: [Receipts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Receipt deleted successfully }
 *       400: { description: Parent claim has already been reviewed }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Receipt not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  receiptController.destroy,
);

module.exports = router;

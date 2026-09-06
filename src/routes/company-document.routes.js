const express = require("express");

const companyDocumentController = require("../controllers/company-document.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     CompanyDocument:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         id_int:
 *           type: number
 *           example: 12
 *         companyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         type:
 *           type: string
 *           enum:
 *             - registration_certificate
 *             - tax_certificate
 *             - address_proof
 *             - authorized_signatory_id
 *             - other
 *           example: registration_certificate
 *         fileUrl:
 *           type: string
 *           example: https://cdn.example.com/companies/68ba.../reg-cert.pdf
 *         fileName:
 *           type: string
 *           example: reg-cert.pdf
 *         mimeType:
 *           type: string
 *           example: application/pdf
 *         sizeBytes:
 *           type: number
 *           example: 204800
 *         uploadedBy:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         status:
 *           type: string
 *           enum:
 *             - pending_review
 *             - approved
 *             - rejected
 *           example: pending_review
 *         version:
 *           type: number
 *           example: 1
 *         reviewedBy:
 *           type: string
 *           nullable: true
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         rejectionReason:
 *           type: string
 *           nullable: true
 */

/**
 * @openapi
 * /api/v1/company-documents/list:
 *   post:
 *     summary: Get company documents
 *     description: >
 *       Get a paginated and filtered list of company documents. Admin and HR
 *       are automatically scoped to their own company regardless of any
 *       filters sent. Super Admin sees all companies, and may filter by
 *       companyId like any other field.
 *     tags:
 *       - Company Documents
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
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *               sort:
 *                 type: string
 *                 enum:
 *                   - ASC
 *                   - DESC
 *                 example: DESC
 *               sort_field:
 *                 type: string
 *                 example: createdAt
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: status
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
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: pending_review
 *
 *     responses:
 *       200:
 *         description: Company documents fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  companyDocumentController.index,
);

/**
 * @openapi
 * /api/v1/company-documents:
 *   post:
 *     summary: Upload a company document
 *     description: >
 *       Uploads a new company document, defaulting to status pending_review.
 *       Admin/HR always upload under their own company — companyId in the
 *       body is ignored for them. Super Admin must supply companyId.
 *     tags:
 *       - Company Documents
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
 *               - type
 *               - fileUrl
 *               - fileName
 *               - mimeType
 *               - sizeBytes
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Required only when the caller is super_admin.
 *                 example: 68ba1234567890abcdef1234
 *               type:
 *                 type: string
 *                 enum:
 *                   - registration_certificate
 *                   - tax_certificate
 *                   - address_proof
 *                   - authorized_signatory_id
 *                   - other
 *                 example: registration_certificate
 *               fileUrl:
 *                 type: string
 *                 example: https://cdn.example.com/companies/68ba.../reg-cert.pdf
 *               fileName:
 *                 type: string
 *                 example: reg-cert.pdf
 *               mimeType:
 *                 type: string
 *                 example: application/pdf
 *               sizeBytes:
 *                 type: number
 *                 example: 204800
 *
 *     responses:
 *       201:
 *         description: Company document uploaded successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  companyDocumentController.store,
);

/**
 * @openapi
 * /api/v1/company-documents/{id}:
 *   get:
 *     summary: Get a company document by ID
 *     description: Admin/HR can only fetch documents belonging to their own company.
 *     tags:
 *       - Company Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Company document fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Company document not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  companyDocumentController.show,
);

/**
 * @openapi
 * /api/v1/company-documents/{id}:
 *   put:
 *     summary: Replace a company document's file
 *     description: >
 *       Re-uploads a document (new fileUrl/fileName/etc). Bumps version and
 *       resets status back to pending_review. Fails if the document is
 *       already approved.
 *     tags:
 *       - Company Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileUrl:
 *                 type: string
 *               fileName:
 *                 type: string
 *               mimeType:
 *                 type: string
 *               sizeBytes:
 *                 type: number
 *     responses:
 *       200:
 *         description: Company document updated successfully
 *       400:
 *         description: Document is already approved and cannot be modified
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Company document not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  companyDocumentController.update,
);

/**
 * @openapi
 * /api/v1/company-documents/{id}:
 *   delete:
 *     summary: Delete a company document
 *     tags:
 *       - Company Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Company document deleted successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Company document not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  companyDocumentController.destroy,
);

/**
 * @openapi
 * /api/v1/company-documents/{id}/review:
 *   put:
 *     summary: Approve or reject a company document
 *     description: Super Admin only.
 *     tags:
 *       - Company Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - approved
 *                   - rejected
 *               rejectionReason:
 *                 type: string
 *                 description: Required when status is rejected.
 *                 example: Certificate image is unreadable
 *     responses:
 *       200:
 *         description: Company document reviewed successfully
 *       400:
 *         description: Invalid status, or missing rejectionReason
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Company document not found
 */
router.put(
  "/:id/review",
  authenticate,
  authorize("super_admin"),
  companyDocumentController.review,
);

module.exports = router;

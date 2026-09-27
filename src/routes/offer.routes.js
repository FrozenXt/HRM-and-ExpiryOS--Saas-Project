const express = require("express");

const offerController = require("../controllers/offer.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Offer:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68d1234567890abcdef1234
 *         candidateId:
 *           description: Populated candidate object in responses.
 *           oneOf:
 *             - type: string
 *               example: 68a1234567890abcdef1234
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 firstName: { type: string, example: Amrita }
 *                 lastName: { type: string, example: Malla }
 *                 email: { type: string, format: email }
 *                 phone: { type: string }
 *                 status: { type: string }
 *         companyId:
 *           description: Populated company object in responses.
 *           oneOf:
 *             - type: string
 *               example: 68b1234567890abcdef1234
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 legalName: { type: string, example: Acme Pvt Ltd }
 *                 tradeName: { type: string, example: Acme }
 *                 logoUrl: { type: string, nullable: true }
 *                 addressLine1: { type: string, nullable: true }
 *                 city: { type: string, nullable: true }
 *                 country: { type: string, nullable: true }
 *         designationId:
 *           description: Populated designation object in responses.
 *           oneOf:
 *             - type: string
 *               example: 68c1234567890abcdef1234
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 name: { type: string, example: Senior Backend Engineer }
 *                 level: { type: string, example: L3 }
 *         offeredSalary:
 *           type: integer
 *           description: Annual gross salary in the company's currency.
 *           example: 1800000
 *         joiningDate:
 *           type: string
 *           format: date
 *           example: 2026-10-15
 *         offerLetterUrl:
 *           type: string
 *           nullable: true
 *           description: Populated after POST /offers/{id}/letter succeeds.
 *           example: /uploads/offer-letters/1738442100-68d1...-offer.pdf
 *         status:
 *           type: string
 *           enum: [draft, sent, accepted, declined, withdrawn]
 *           example: sent
 *         issuedBy:
 *           description: Populated issuer user object in responses.
 *           oneOf:
 *             - type: string
 *               example: 68d1234567890abcdef9999
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 firstName: { type: string, example: Rahul }
 *                 lastName: { type: string, example: Sharma }
 *                 email: { type: string, format: email }
 *                 role: { type: string, enum: [super_admin, admin, hr] }
 *         issuedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-09-25T08:30:00.000Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/offers/list:
 *   post:
 *     summary: Get offers
 *     description: >-
 *       Paginated, filtered list of offers. Super Admin sees all companies
 *       (optionally filtered by companyId); Admin/HR see only their own
 *       company. Every ObjectId in the response is populated with the
 *       referenced document's basic fields.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [ASC, DESC]
 *                 example: DESC
 *               sort_field:
 *                 type: string
 *                 example: issuedAt
 *               fields:
 *                 type: array
 *                 description: List of filters to apply.
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
 *                       example: sent
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: DESC
 *             sort_field: issuedAt
 *             fields:
 *               - field: status
 *                 operator: eq
 *                 value: sent
 *     responses:
 *       200:
 *         description: Offers fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Offers fetched successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Offer' }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: integer, example: 1 }
 *                         limit: { type: integer, example: 20 }
 *                         total: { type: integer, example: 12 }
 *                         total_pages: { type: integer, example: 1 }
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  offerController.index,
);

/**
 * @openapi
 * /api/v1/offers:
 *   post:
 *     summary: Create an offer
 *     description: >-
 *       Creates a new offer for a candidate. The issuer is taken from the
 *       authenticated user (issuedBy) and issuedAt defaults to now. Admin/HR
 *       are automatically scoped to their own company; Super Admin must
 *       supply companyId.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateId
 *               - designationId
 *               - offeredSalary
 *               - joiningDate
 *             properties:
 *               candidateId:
 *                 type: string
 *                 example: 68a1234567890abcdef1234
 *               companyId:
 *                 type: string
 *                 description: Required only for super_admin.
 *                 example: 68b1234567890abcdef1234
 *               designationId:
 *                 type: string
 *                 example: 68c1234567890abcdef1234
 *               offeredSalary:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1800000
 *               joiningDate:
 *                 type: string
 *                 format: date
 *                 example: 2026-10-15
 *               status:
 *                 type: string
 *                 enum: [draft, sent, accepted, declined, withdrawn]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Offer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Offer created successfully }
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       400:
 *         description: Invalid request data or missing required fields
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  offerController.store,
);

/**
 * @openapi
 * /api/v1/offers/{id}/letter:
 *   post:
 *     summary: Generate an offer letter (PDF)
 *     description: >-
 *       Renders a PDF offer letter using the offer's populated data
 *       (company name/address, candidate name, designation, salary,
 *       joining date, issuer) and stores it on disk. The resulting
 *       public path is written back to the offer as offerLetterUrl and
 *       the fully-populated offer is returned.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Offer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68d1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Offer letter generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Offer letter generated successfully }
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       400:
 *         description: Offer missing required fields for letter generation
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Offer not found
 */
router.post(
  "/:id/letter",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  offerController.generateLetter,
);

/**
 * @openapi
 * /api/v1/offers/{id}:
 *   get:
 *     summary: Get an offer by ID
 *     description: Returns a single offer with all references populated.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Offer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68d1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Offer fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Offer fetched successfully }
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Offer not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  offerController.show,
);

/**
 * @openapi
 * /api/v1/offers/{id}:
 *   put:
 *     summary: Update an offer
 *     description: >-
 *       Partial update of an offer. Ownership fields (candidateId,
 *       companyId, issuedBy, issuedAt) cannot be reassigned. Typically
 *       used to change status (draft → sent → accepted/declined/withdrawn)
 *       or update salary / joining date before sending.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Offer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68d1234567890abcdef1234
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               designationId: { type: string }
 *               offeredSalary: { type: integer, minimum: 0 }
 *               joiningDate: { type: string, format: date }
 *               offerLetterUrl: { type: string }
 *               status:
 *                 type: string
 *                 enum: [draft, sent, accepted, declined, withdrawn]
 *           example:
 *             status: accepted
 *     responses:
 *       200:
 *         description: Offer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Offer updated successfully }
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Offer not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  offerController.update,
);

/**
 * @openapi
 * /api/v1/offers/{id}:
 *   delete:
 *     summary: Delete an offer
 *     description: Permanently deletes an offer record.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Offer MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68d1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Offer deleted successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Offer not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  offerController.destroy,
);

module.exports = router;

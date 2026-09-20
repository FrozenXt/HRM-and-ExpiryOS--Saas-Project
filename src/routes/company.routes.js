const express = require("express");

const companyController = require("../controllers/company.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         legalName:
 *           type: string
 *           example: Acme Pvt Ltd
 *         tradeName:
 *           type: string
 *           example: Acme
 *         registrationNumber:
 *           type: string
 *           example: REG-2026-000123
 *         taxId:
 *           type: string
 *           example: TAX-998877
 *         industry:
 *           type: string
 *           example: Software
 *         country:
 *           type: string
 *           enum:
 *             - IN
 *             - NP
 *             - US
 *             - other
 *           example: NP
 *         currencyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         planId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         billingEmail:
 *           type: string
 *           format: email
 *           example: billing@acme.com
 *         subscriptionStatus:
 *           type: string
 *           enum:
 *             - trial
 *             - active
 *             - past_due
 *             - suspended
 *             - cancelled
 *           example: trial
 *         adminUserId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         isActive:
 *           type: boolean
 *           example: true
 *         verificationStatus:
 *           type: string
 *           enum:
 *             - pending
 *             - verified
 *             - rejected
 *           example: pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/companies/list:
 *   post:
 *     summary: Get companies
 *     description: Get a paginated and filtered list of companies. Super Admin only.
 *     tags:
 *       - Companies
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
 *                       example: legalName
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
 *                       example: Acme
 *
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: DESC
 *             sort_field: createdAt
 *             fields:
 *               - field: verificationStatus
 *                 operator: eq
 *                 value: pending
 *
 *     responses:
 *       200:
 *         description: Companies fetched successfully
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
  authorize("super_admin"),
  companyController.index,
);

/**
 * @openapi
 * /api/v1/companies/register:
 *   post:
 *     summary: Register a new company
 *     description: >
 *       Creates a new Company and its first Admin user in a single atomic
 *       operation. Super Admin only.
 *     tags:
 *       - Companies
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
 *               - legalName
 *               - registrationNumber
 *               - taxId
 *               - contactPerson
 *               - address
 *               - country
 *               - currencyId
 *               - planId
 *               - billingEmail
 *               - admin
 *             properties:
 *               legalName:
 *                 type: string
 *                 example: Acme Pvt Ltd
 *               tradeName:
 *                 type: string
 *                 example: Acme
 *               registrationNumber:
 *                 type: string
 *                 example: REG-2026-000123
 *               taxId:
 *                 type: string
 *                 example: TAX-998877
 *               industry:
 *                 type: string
 *                 example: Software
 *               foundedDate:
 *                 type: string
 *                 format: date
 *                 example: 2020-01-15
 *               contactPerson:
 *                 type: object
 *                 required:
 *                   - name
 *                   - email
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Sujal Lamichhane
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: sujal@acme.com
 *                   phone:
 *                     type: string
 *                     example: "+977-9800000000"
 *                   designation:
 *                     type: string
 *                     example: Operations Head
 *               address:
 *                 type: object
 *                 required:
 *                   - line1
 *                   - city
 *                   - state
 *                   - country
 *                   - postalCode
 *                 properties:
 *                   line1:
 *                     type: string
 *                     example: 123 Durbar Marg
 *                   line2:
 *                     type: string
 *                     example: Suite 4B
 *                   city:
 *                     type: string
 *                     example: Kathmandu
 *                   state:
 *                     type: string
 *                     example: Bagmati
 *                   country:
 *                     type: string
 *                     example: Nepal
 *                   postalCode:
 *                     type: string
 *                     example: "44600"
 *               country:
 *                 type: string
 *                 enum:
 *                   - IN
 *                   - NP
 *                   - US
 *                   - other
 *                 example: NP
 *               currencyId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               planId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               billingEmail:
 *                 type: string
 *                 format: email
 *                 example: billing@acme.com
 *               employeeLimit:
 *                 type: integer
 *                 example: 50
 *               subscriptionStatus:
 *                 type: string
 *                 enum:
 *                   - trial
 *                   - active
 *                   - past_due
 *                   - suspended
 *                   - cancelled
 *                 default: trial
 *               subscriptionStartDate:
 *                 type: string
 *                 format: date
 *               subscriptionEndDate:
 *                 type: string
 *                 format: date
 *               logoUrl:
 *                 type: string
 *               statutoryConfig:
 *                 type: object
 *                 description: India-specific identifiers. Only relevant when country = IN.
 *                 properties:
 *                   panOfCompany:
 *                     type: string
 *                   tanNumber:
 *                     type: string
 *                   gstin:
 *                     type: string
 *                   pfEstablishmentId:
 *                     type: string
 *                   esiEstablishmentId:
 *                     type: string
 *                   ptState:
 *                     type: string
 *               admin:
 *                 type: object
 *                 description: The first Admin user created for this company.
 *                 required:
 *                   - firstName
 *                   - lastName
 *                   - email
 *                   - password
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     example: Sujal
 *                   lastName:
 *                     type: string
 *                     example: Lamichhane
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: admin@acme.com
 *                   password:
 *                     type: string
 *                     format: password
 *                     minLength: 8
 *                     example: Password@123
 *                   mustResetPassword:
 *                     type: boolean
 *                     default: true
 *
 *     responses:
 *       201:
 *         description: Company registered successfully
 *
 *       400:
 *         description: Invalid request data, duplicate registration number, or duplicate admin email
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: You do not have permission to register companies
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  authenticate,
  authorize("super_admin"),
  companyController.register,
);

/**
 * @openapi
 * /api/v1/companies/{id}:
 *   get:
 *     summary: Get a company by ID
 *     description: Get a single company by its ID. Super Admin only.
 *     tags:
 *       - Companies
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Company MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Company not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin"),
  companyController.show,
);

/**
 * @openapi
 * /api/v1/companies/{id}:
 *   put:
 *     summary: Update a company
 *     description: Update an existing company. Super Admin only.
 *     tags:
 *       - Companies
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Company MongoDB ObjectId
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
 *               legalName:
 *                 type: string
 *               tradeName:
 *                 type: string
 *               industry:
 *                 type: string
 *               billingEmail:
 *                 type: string
 *                 format: email
 *               employeeLimit:
 *                 type: integer
 *               subscriptionStatus:
 *                 type: string
 *                 enum:
 *                   - trial
 *                   - active
 *                   - past_due
 *                   - suspended
 *                   - cancelled
 *               subscriptionEndDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *               verificationStatus:
 *                 type: string
 *                 enum:
 *                   - pending
 *                   - verified
 *                   - rejected
 *
 *     responses:
 *       200:
 *         description: Company updated successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Company not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin"),
  companyController.update,
);

/**
 * @openapi
 * /api/v1/companies/{id}/verification:
 *   patch:
 *     summary: Approve or reject company verification
 *     description: Set a company's verification status. Super Admin only.
 *     tags:
 *       - Companies
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Company MongoDB ObjectId
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
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       200:
 *         description: Company verification updated
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Company not found
 */
router.patch(
  "/:id/verification",
  authenticate,
  authorize("super_admin"),
  companyController.verify,
);
/**
 * @openapi
 * /api/v1/companies/{id}:
 *   delete:
 *     summary: Delete a company
 *     description: Delete a company by its ID. Super Admin only.
 *     tags:
 *       - Companies
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Company MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Company deleted successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Company not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  companyController.destroy,
);

module.exports = router;

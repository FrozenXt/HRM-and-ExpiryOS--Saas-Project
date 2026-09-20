const express = require("express");
const statutoryRuleController = require("../controllers/statutory-rule.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     StatutoryRule:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         country: { type: string, enum: [IN, NP, US, other] }
 *         type: { type: string, enum: [pf, esi, professional_tax, tds, gratuity, labour_welfare_fund] }
 *         employeeContributionPercent: { type: number, nullable: true }
 *         employerContributionPercent: { type: number, nullable: true }
 *         wageCeiling: { type: number, nullable: true, example: 15000 }
 *         flatAmount: { type: number, nullable: true }
 *         effectiveFrom: { type: string, format: date }
 *         effectiveTo: { type: string, format: date, nullable: true }
 *         isActive: { type: boolean }
 */

/**
 * @openapi
 * /api/v1/statutory-rules/list:
 *   post:
 *     summary: Get statutory rules
 *     tags: [Statutory Rules]
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
 *                     field: { type: string, example: country }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: IN }
 *     responses:
 *       200: { description: Statutory rules fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin"),
  statutoryRuleController.index,
);

/**
 * @openapi
 * /api/v1/statutory-rules:
 *   post:
 *     summary: Create a statutory rule
 *     description: Refused if an open-ended (no effectiveTo) active rule already exists for the same country+type.
 *     tags: [Statutory Rules]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country, type, effectiveFrom]
 *             properties:
 *               country: { type: string, enum: [IN, NP, US, other] }
 *               type: { type: string, enum: [pf, esi, professional_tax, tds, gratuity, labour_welfare_fund] }
 *               employeeContributionPercent: { type: number }
 *               employerContributionPercent: { type: number }
 *               wageCeiling: { type: number, example: 15000 }
 *               flatAmount: { type: number }
 *               effectiveFrom: { type: string, format: date }
 *               effectiveTo: { type: string, format: date }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201: { description: Statutory rule created successfully }
 *       400: { description: Invalid data or overlapping open-ended active rule }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  statutoryRuleController.store,
);

/**
 * @openapi
 * /api/v1/statutory-rules/{id}:
 *   get:
 *     summary: Get a statutory rule by ID
 *     tags: [Statutory Rules]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Statutory rule fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Statutory rule not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin"),
  statutoryRuleController.show,
);

/**
 * @openapi
 * /api/v1/statutory-rules/{id}:
 *   put:
 *     summary: Update a statutory rule
 *     tags: [Statutory Rules]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeContributionPercent: { type: number }
 *               employerContributionPercent: { type: number }
 *               wageCeiling: { type: number }
 *               flatAmount: { type: number }
 *               effectiveTo: { type: string, format: date }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Statutory rule updated successfully }
 *       400: { description: Overlapping open-ended active rule }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Statutory rule not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin"),
  statutoryRuleController.update,
);

/**
 * @openapi
 * /api/v1/statutory-rules/{id}:
 *   delete:
 *     summary: Delete a statutory rule
 *     tags: [Statutory Rules]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Statutory rule deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Statutory rule not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  statutoryRuleController.destroy,
);

module.exports = router;

const express = require("express");
const monitoringConsentController = require("../controllers/monitoring-consent.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     MonitoringConsent:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         consentGiven: { type: boolean }
 *         consentDate: { type: string, format: date-time }
 *         policyVersion: { type: string, example: "v1.0" }
 *         ipAddress: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/monitoring-consents/me:
 *   get:
 *     summary: Get my current monitoring consent status
 *     description: Returns hasConsented plus the latest consent record (null if none yet).
 *     tags: [Monitoring Consents]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current monitoring consent fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: No employee profile found for this account }
 */
router.get(
  "/me",
  authenticate,
  authorize("admin", "hr", "staff"),
  monitoringConsentController.me,
);

/**
 * @openapi
 * /api/v1/monitoring-consents/list:
 *   post:
 *     summary: Get monitoring consent records
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Monitoring Consents]
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
 *               sort_field: { type: string, example: consentDate }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: consentGiven }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: "true" }
 *     responses:
 *       200: { description: Monitoring consents fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  monitoringConsentController.index,
);

/**
 * @openapi
 * /api/v1/monitoring-consents:
 *   post:
 *     summary: Record my monitoring consent (grant or revoke)
 *     description: >
 *       Always recorded against the caller's OWN employee profile — nobody can
 *       record consent on someone else's behalf. Append-only: revoking is a new
 *       record with consentGiven=false, and the latest record wins. consentDate
 *       and ipAddress are set by the server.
 *     tags: [Monitoring Consents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consentGiven, policyVersion]
 *             properties:
 *               consentGiven: { type: boolean }
 *               policyVersion: { type: string, example: "v1.0" }
 *     responses:
 *       201: { description: Monitoring consent recorded successfully }
 *       400: { description: Invalid data or no employee profile }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr", "staff"),
  monitoringConsentController.store,
);

/**
 * @openapi
 * /api/v1/monitoring-consents/{id}:
 *   get:
 *     summary: Get a monitoring consent record by ID
 *     tags: [Monitoring Consents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Monitoring consent fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Monitoring consent not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  monitoringConsentController.show,
);

module.exports = router;

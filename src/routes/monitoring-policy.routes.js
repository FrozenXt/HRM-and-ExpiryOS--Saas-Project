const express = require("express");
const monitoringPolicyController = require("../controllers/monitoring-policy.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     MonitoringPolicy:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         country: { type: string, enum: [IN, NP, US, other] }
 *         screenshotEnabled: { type: boolean, default: false }
 *         screenshotIntervalMinutes: { type: number, nullable: true, example: 10 }
 *         locationTrackingEnabled: { type: boolean, default: false }
 *         geofencingEnabled: { type: boolean, default: false }
 *         activityTrackingEnabled: { type: boolean, default: false }
 *         retentionDays: { type: number, default: 90 }
 */

/**
 * @openapi
 * /api/v1/monitoring-policy:
 *   get:
 *     summary: Get the company's monitoring policy
 *     description: >
 *       Admin gets their own company's policy automatically. Super Admin must
 *       pass companyId as a query param. Lazy-created with every toggle off
 *       (and 90-day retention) on first access.
 *     tags: [Monitoring Policy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: companyId
 *         in: query
 *         required: false
 *         description: Required for super_admin, ignored for admin.
 *         schema: { type: string }
 *     responses:
 *       200: { description: Monitoring policy fetched successfully }
 *       400: { description: companyId required for super_admin }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.get(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  monitoringPolicyController.show,
);

/**
 * @openapi
 * /api/v1/monitoring-policy:
 *   put:
 *     summary: Update the company's monitoring policy
 *     description: >
 *       Partial update — only fields you send are changed. Admin updates their
 *       own company automatically; Super Admin must supply companyId in the body.
 *       These toggles are the company-wide master switches: even with them on,
 *       an individual employee's MonitoringConsent must also be "given" before
 *       any of their data is accepted.
 *     tags: [Monitoring Policy]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               country: { type: string, enum: [IN, NP, US, other] }
 *               screenshotEnabled: { type: boolean }
 *               screenshotIntervalMinutes: { type: number, example: 10 }
 *               locationTrackingEnabled: { type: boolean }
 *               geofencingEnabled: { type: boolean }
 *               activityTrackingEnabled: { type: boolean }
 *               retentionDays: { type: number, example: 90 }
 *     responses:
 *       200: { description: Monitoring policy updated successfully }
 *       400: { description: Invalid values, or companyId required for super_admin }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.put(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  monitoringPolicyController.update,
);

module.exports = router;

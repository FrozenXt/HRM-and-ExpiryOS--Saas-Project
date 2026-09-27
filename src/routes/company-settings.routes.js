const express = require("express");
const companySettingsController = require("../controllers/company-settings.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     CompanySettings:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         workingHours:
 *           type: object
 *           properties:
 *             startTime: { type: string, example: "09:00" }
 *             endTime: { type: string, example: "18:00" }
 *             timezone: { type: string, example: "Asia/Kathmandu" }
 *         weekOff:
 *           type: array
 *           items: { type: string, enum: [sun, mon, tue, wed, thu, fri, sat] }
 *           example: ["sat", "sun"]
 *         attendancePolicy:
 *           type: object
 *           properties:
 *             fullDayMinHours: { type: number, example: 8 }
 *             halfDayMinHours: { type: number, example: 4 }
 *             lateMarkGraceMinutes: { type: number, example: 15 }
 *             autoMarkAbsentIfNoCheckIn: { type: boolean }
 *         financialYearStartMonth: { type: number, example: 4, description: "1-12, e.g. 4 = April for India" }
 *         branding:
 *           type: object
 *           properties:
 *             primaryColor: { type: string, example: "#4f46e5" }
 *             secondaryColor: { type: string, example: "#0ea5e9" }
 *             logoUrl: { type: string, nullable: true }
 *             defaultTheme: { type: string, enum: [light, dark, auto] }
 *         mailSettings:
 *           type: object
 *           description: smtpPassword is write-only — never returned by GET.
 *           properties:
 *             fromName: { type: string, nullable: true }
 *             fromEmail: { type: string, nullable: true }
 *             smtpHost: { type: string, nullable: true }
 *             smtpPort: { type: number, nullable: true }
 *             smtpUsername: { type: string, nullable: true }
 *             useTls: { type: boolean }
 *         countrySettings:
 *           type: object
 *           properties:
 *             country: { type: string, enum: [IN, NP, US, other] }
 *             pfApplicable: { type: boolean }
 *             esiApplicable: { type: boolean }
 *             professionalTaxApplicable: { type: boolean }
 *             tdsApplicable: { type: boolean }
 *         notifications:
 *           type: object
 *           properties:
 *             documentExpiryReminders: { type: boolean }
 *             leaveRequestAlerts: { type: boolean }
 *             attendanceAlerts: { type: boolean }
 */

/**
 * @openapi
 * /api/v1/company-settings:
 *   get:
 *     summary: Get company settings
 *     description: >
 *       Admin gets their own company's settings automatically. Super Admin
 *       must pass companyId as a query param. Lazy-created with defaults on
 *       first access if none exist yet.
 *     tags: [Company Settings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: companyId
 *         in: query
 *         required: false
 *         description: Required for super_admin, ignored for admin.
 *         schema: { type: string }
 *     responses:
 *       200: { description: Company settings fetched successfully }
 *       400: { description: companyId required for super_admin }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.get(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  companySettingsController.show,
);

/**
 * @openapi
 * /api/v1/company-settings:
 *   put:
 *     summary: Update company settings
 *     description: >
 *       Partial update — only the nested fields you send are changed, everything
 *       else is left as-is. Admin updates their own company automatically;
 *       Super Admin must supply companyId in the body.
 *     tags: [Company Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               workingHours:
 *                 type: object
 *                 properties:
 *                   startTime: { type: string, example: "09:00" }
 *                   endTime: { type: string, example: "18:00" }
 *                   timezone: { type: string }
 *               weekOff:
 *                 type: array
 *                 items: { type: string, enum: [sun, mon, tue, wed, thu, fri, sat] }
 *               attendancePolicy:
 *                 type: object
 *                 properties:
 *                   fullDayMinHours: { type: number }
 *                   halfDayMinHours: { type: number }
 *                   lateMarkGraceMinutes: { type: number }
 *                   autoMarkAbsentIfNoCheckIn: { type: boolean }
 *               financialYearStartMonth: { type: number, example: 4 }
 *               branding:
 *                 type: object
 *                 properties:
 *                   primaryColor: { type: string }
 *                   secondaryColor: { type: string }
 *                   logoUrl: { type: string }
 *                   defaultTheme: { type: string, enum: [light, dark, auto] }
 *               mailSettings:
 *                 type: object
 *                 properties:
 *                   fromName: { type: string }
 *                   fromEmail: { type: string }
 *                   smtpHost: { type: string }
 *                   smtpPort: { type: number }
 *                   smtpUsername: { type: string }
 *                   smtpPassword: { type: string, description: "Encrypted at rest, write-only" }
 *                   useTls: { type: boolean }
 *               countrySettings:
 *                 type: object
 *                 properties:
 *                   country: { type: string, enum: [IN, NP, US, other] }
 *                   pfApplicable: { type: boolean }
 *                   esiApplicable: { type: boolean }
 *                   professionalTaxApplicable: { type: boolean }
 *                   tdsApplicable: { type: boolean }
 *               notifications:
 *                 type: object
 *                 properties:
 *                   documentExpiryReminders: { type: boolean }
 *                   leaveRequestAlerts: { type: boolean }
 *                   attendanceAlerts: { type: boolean }
 *     responses:
 *       200: { description: Company settings updated successfully }
 *       400: { description: companyId required for super_admin }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.put(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  companySettingsController.update,
);

module.exports = router;

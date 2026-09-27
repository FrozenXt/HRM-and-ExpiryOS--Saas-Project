const express = require("express");

const geofenceZoneController = require("../controllers/geofence-zone.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     GeofenceZone:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         companyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         name:
 *           type: string
 *           example: Head Office - Kathmandu
 *         latitude:
 *           type: number
 *           example: 27.7172
 *         longitude:
 *           type: number
 *           example: 85.3240
 *         radiusMeters:
 *           type: number
 *           example: 150
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/geofence-zones/list:
 *   post:
 *     summary: Get geofence zones
 *     description: >
 *       Everyone in a company (including staff) can read its zones — field
 *       staff need this to validate check-in location. Super Admin sees all
 *       companies.
 *     tags:
 *       - Geofence Zones
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
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 example: 20
 *               sort:
 *                 type: string
 *                 enum: [ASC, DESC]
 *                 example: ASC
 *               sort_field:
 *                 type: string
 *                 example: name
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: isActive
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: "true"
 *     responses:
 *       200:
 *         description: Geofence zones fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, geofenceZoneController.index);

/**
 * @openapi
 * /api/v1/geofence-zones:
 *   post:
 *     summary: Create a geofence zone
 *     description: Admin/HR/Super Admin only. Super Admin must supply companyId.
 *     tags:
 *       - Geofence Zones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *               - radiusMeters
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Required for super_admin only.
 *               name:
 *                 type: string
 *                 example: Head Office - Kathmandu
 *               latitude:
 *                 type: number
 *                 example: 27.7172
 *               longitude:
 *                 type: number
 *                 example: 85.3240
 *               radiusMeters:
 *                 type: number
 *                 example: 150
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Geofence zone created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  geofenceZoneController.create,
);

/**
 * @openapi
 * /api/v1/geofence-zones/{id}:
 *   get:
 *     summary: Get a geofence zone by ID
 *     tags:
 *       - Geofence Zones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Geofence zone fetched successfully
 *       404:
 *         description: Geofence zone not found
 */
router.get("/:id", authenticate, geofenceZoneController.show);

/**
 * @openapi
 * /api/v1/geofence-zones/{id}:
 *   patch:
 *     summary: Update a geofence zone
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Geofence Zones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               radiusMeters:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Geofence zone updated successfully
 *       404:
 *         description: Geofence zone not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  geofenceZoneController.update,
);

/**
 * @openapi
 * /api/v1/geofence-zones/{id}:
 *   delete:
 *     summary: Delete a geofence zone
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Geofence Zones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Geofence zone deleted successfully
 *       404:
 *         description: Geofence zone not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  geofenceZoneController.destroy,
);

module.exports = router;

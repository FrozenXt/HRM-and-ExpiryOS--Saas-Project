const express = require("express");
const assetController = require("../controllers/asset.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Asset:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         assetTag: { type: string, example: "LAP-001" }
 *         name: { type: string, example: "Dell Latitude 5420" }
 *         category: { type: string, enum: [laptop, mobile, accessory, furniture, other] }
 *         serialNumber: { type: string, nullable: true }
 *         purchaseDate: { type: string, format: date, nullable: true }
 *         purchaseCost: { type: number, nullable: true }
 *         status: { type: string, enum: [available, assigned, under_repair, retired] }
 *         currentAssignment:
 *           type: object
 *           nullable: true
 *           description: "The active assignment holding this asset, if any (populated automatically)."
 */

/**
 * @openapi
 * /api/v1/assets/list:
 *   post:
 *     summary: Get assets
 *     description: >
 *       Admin/HR are auto-scoped to their own company. Super Admin sees all.
 *       Each asset includes its live currentAssignment (who has it right
 *       now, if anyone) — no separate call needed.
 *     tags: [Assets]
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
 *                     value: { type: string, example: available }
 *     responses:
 *       200: { description: Assets fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetController.index,
);

/**
 * @openapi
 * /api/v1/assets:
 *   post:
 *     summary: Add a new asset
 *     description: Admin/HR create under their own company; companyId is ignored for them. Super Admin must supply companyId.
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetTag, name, category]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               assetTag: { type: string, example: "LAP-001" }
 *               name: { type: string, example: "Dell Latitude 5420" }
 *               category: { type: string, enum: [laptop, mobile, accessory, furniture, other] }
 *               serialNumber: { type: string }
 *               purchaseDate: { type: string, format: date }
 *               purchaseCost: { type: number }
 *               status: { type: string, enum: [available, assigned, under_repair, retired], default: available }
 *     responses:
 *       201: { description: Asset created successfully }
 *       400: { description: Invalid data or duplicate asset tag in this company }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetController.store,
);

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   get:
 *     summary: Get an asset by ID
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetController.show,
);

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   put:
 *     summary: Update an asset
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetTag: { type: string }
 *               name: { type: string }
 *               category: { type: string, enum: [laptop, mobile, accessory, furniture, other] }
 *               serialNumber: { type: string }
 *               purchaseDate: { type: string, format: date }
 *               purchaseCost: { type: number }
 *               status: { type: string, enum: [available, assigned, under_repair, retired] }
 *     responses:
 *       200: { description: Asset updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetController.update,
);

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     description: Fails if the asset is currently assigned — return it first.
 *     tags: [Assets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Asset deleted successfully }
 *       400: { description: Asset is currently assigned }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Asset not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  assetController.destroy,
);

module.exports = router;

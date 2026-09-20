const express = require("express");
const currencyController = require("../controllers/currency.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Currency:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         code: { type: string, enum: [INR, NPR, USD, other] }
 *         symbol: { type: string, example: "₹" }
 *         name: { type: string, example: "Indian Rupee" }
 *         decimalPlaces: { type: number, default: 2 }
 *         isActive: { type: boolean, default: true }
 */

/**
 * @openapi
 * /api/v1/currencies/list:
 *   post:
 *     summary: Get currencies
 *     tags: [Currencies]
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
 *                     field: { type: string }
 *                     operator: { type: string }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Currencies fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin"),
  currencyController.index,
);

/**
 * @openapi
 * /api/v1/currencies:
 *   post:
 *     summary: Create a currency
 *     tags: [Currencies]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, symbol, name]
 *             properties:
 *               code: { type: string, enum: [INR, NPR, USD, other] }
 *               symbol: { type: string, example: "₹" }
 *               name: { type: string, example: "Indian Rupee" }
 *               decimalPlaces: { type: number, default: 2 }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201: { description: Currency created successfully }
 *       400: { description: Invalid data or duplicate code }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  currencyController.store,
);

/**
 * @openapi
 * /api/v1/currencies/{id}:
 *   get:
 *     summary: Get a currency by ID
 *     tags: [Currencies]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Currency fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Currency not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin"),
  currencyController.show,
);

/**
 * @openapi
 * /api/v1/currencies/{id}:
 *   put:
 *     summary: Update a currency
 *     tags: [Currencies]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol: { type: string }
 *               name: { type: string }
 *               decimalPlaces: { type: number }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Currency updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Currency not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin"),
  currencyController.update,
);

/**
 * @openapi
 * /api/v1/currencies/{id}:
 *   delete:
 *     summary: Delete a currency
 *     description: Refused with 409 if any company still uses it.
 *     tags: [Currencies]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Currency deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Currency not found }
 *       409: { description: Currency is still in use }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  currencyController.destroy,
);

module.exports = router;

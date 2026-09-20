const express = require("express");
const currencyExchangeRateController = require("../controllers/currency-exchange-rate.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     CurrencyExchangeRate:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         baseCurrencyId: { type: string }
 *         targetCurrencyId: { type: string }
 *         rate: { type: number, example: 0.012 }
 *         effectiveDate: { type: string, format: date }
 *         source: { type: string, enum: [manual, api] }
 */

/**
 * @openapi
 * /api/v1/currency-exchange-rates/list:
 *   post:
 *     summary: Get currency exchange rates
 *     tags: [Currency Exchange Rates]
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
 *               sort_field: { type: string, example: effectiveDate }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     operator: { type: string }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Currency exchange rates fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin"),
  currencyExchangeRateController.index,
);

/**
 * @openapi
 * /api/v1/currency-exchange-rates:
 *   post:
 *     summary: Create a currency exchange rate
 *     tags: [Currency Exchange Rates]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baseCurrencyId, targetCurrencyId, rate, effectiveDate]
 *             properties:
 *               baseCurrencyId: { type: string }
 *               targetCurrencyId: { type: string }
 *               rate: { type: number, example: 0.012 }
 *               effectiveDate: { type: string, format: date }
 *               source: { type: string, enum: [manual, api], default: manual }
 *     responses:
 *       201: { description: Currency exchange rate created successfully }
 *       400: { description: Invalid data, same currency on both sides, or duplicate pair+date }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  currencyExchangeRateController.store,
);

/**
 * @openapi
 * /api/v1/currency-exchange-rates/{id}:
 *   get:
 *     summary: Get a currency exchange rate by ID
 *     tags: [Currency Exchange Rates]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Currency exchange rate fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Currency exchange rate not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin"),
  currencyExchangeRateController.show,
);

/**
 * @openapi
 * /api/v1/currency-exchange-rates/{id}:
 *   put:
 *     summary: Update a currency exchange rate
 *     tags: [Currency Exchange Rates]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rate: { type: number }
 *               source: { type: string, enum: [manual, api] }
 *     responses:
 *       200: { description: Currency exchange rate updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Currency exchange rate not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin"),
  currencyExchangeRateController.update,
);

/**
 * @openapi
 * /api/v1/currency-exchange-rates/{id}:
 *   delete:
 *     summary: Delete a currency exchange rate
 *     tags: [Currency Exchange Rates]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Currency exchange rate deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Currency exchange rate not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  currencyExchangeRateController.destroy,
);

module.exports = router;

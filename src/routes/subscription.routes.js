const express = require("express");

const subscriptionController = require("../controllers/subscription.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         id_int:
 *           type: number
 *           example: 7
 *         companyId:
 *           type: string
 *         planId:
 *           type: string
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly]
 *         employeeCount:
 *           type: number
 *         pricePerEmployee:
 *           type: number
 *         totalAmount:
 *           type: number
 *         currency:
 *           type: string
 *           example: NPR
 *         startDate:
 *           type: string
 *           format: date-time
 *         nextBillingDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, past_due, cancelled]
 */

/**
 * @openapi
 * /api/v1/subscriptions/list:
 *   post:
 *     summary: List all company subscriptions
 *     description: Paginated/filtered list of every company's subscription. Super Admin only.
 *     tags:
 *       - Subscriptions
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
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 example: 20
 *               sort:
 *                 type: string
 *                 enum: [ASC, DESC]
 *                 example: DESC
 *               sort_field:
 *                 type: string
 *                 example: createdAt
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: status
 *                     operator:
 *                       type: string
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: active
 *
 *     responses:
 *       200:
 *         description: Subscriptions fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin"),
  subscriptionController.index,
);

/**
 * @openapi
 * /api/v1/subscriptions/me:
 *   get:
 *     summary: Get my company's subscription
 *     description: >
 *       Returns the authenticated company admin's subscription, re-synced
 *       against the company's current active-employee count first.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Subscription fetched successfully
 *
 *       400:
 *         description: No company associated with this user
 *
 *       401:
 *         description: Authentication required or invalid access token
 */
router.get(
  "/me",
  authenticate,
  authorize("admin", "super_admin"),
  subscriptionController.me,
);

/**
 * @openapi
 * /api/v1/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to / change a plan
 *     description: >
 *       Subscribes the authenticated admin's company to the given plan and
 *       billing cycle. Price and employee count are always computed
 *       server-side from the company's current active employees — the
 *       frontend cannot set them.
 *     tags:
 *       - Subscriptions
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
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 default: monthly
 *
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *
 *       400:
 *         description: Invalid plan, or employee count exceeds the plan's limit
 *
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post(
  "/subscribe",
  authenticate,
  authorize("admin", "super_admin"),
  subscriptionController.subscribe,
);

/**
 * @openapi
 * /api/v1/subscriptions/{id}:
 *   put:
 *     summary: Manually update a subscription
 *     description: >
 *       Super Admin override — mainly for Enterprise custom pricing, or
 *       correcting status (e.g. past_due, cancelled) and nextBillingDate.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalAmount:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, past_due, cancelled]
 *               nextBillingDate:
 *                 type: string
 *                 format: date-time
 *
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *
 *       404:
 *         description: Subscription not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin"),
  subscriptionController.update,
);

module.exports = router;

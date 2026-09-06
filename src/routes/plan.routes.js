const express = require("express");

const planController = require("../controllers/plan.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Plan:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         id_int:
 *           type: number
 *           example: 3
 *         name:
 *           type: string
 *           example: Growth
 *         employeeLimit:
 *           type: number
 *           example: 100
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["payroll", "attendance", "expense_claims"]
 *         monthlyPrice:
 *           type: number
 *           example: 49
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
 * /api/v1/plans/list:
 *   post:
 *     summary: Get plans
 *     description: Get a paginated and filtered list of plans. Super Admin only.
 *     tags:
 *       - Plans
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
 *                 example: monthlyPrice
 *
 *               fields:
 *                 type: array
 *                 description: List of filters to apply.
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: name
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
 *                       example: Growth
 *
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: ASC
 *             sort_field: monthlyPrice
 *             fields:
 *               - field: isActive
 *                 operator: eq
 *                 value: true
 *
 *     responses:
 *       200:
 *         description: Plans fetched successfully
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
  planController.index,
);

/**
 * @openapi
 * /api/v1/plans:
 *   post:
 *     summary: Create a new plan
 *     description: Create a new subscription plan. Super Admin only.
 *     tags:
 *       - Plans
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
 *               - name
 *               - employeeLimit
 *               - monthlyPrice
 *             properties:
 *               name:
 *                 type: string
 *                 example: Growth
 *               employeeLimit:
 *                 type: number
 *                 example: 100
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["payroll", "attendance", "expense_claims"]
 *               monthlyPrice:
 *                 type: number
 *                 example: 49
 *               isActive:
 *                 type: boolean
 *                 default: true
 *
 *     responses:
 *       201:
 *         description: Plan created successfully
 *
 *       400:
 *         description: Invalid request data, or a plan with this name already exists
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
router.post("/", authenticate, authorize("super_admin"), planController.store);

/**
 * @openapi
 * /api/v1/plans/{id}:
 *   get:
 *     summary: Get a plan by ID
 *     description: Get a single plan by its ID. Super Admin only.
 *     tags:
 *       - Plans
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Plan MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Plan fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Plan not found
 */
router.get("/:id", authenticate, authorize("super_admin"), planController.show);

/**
 * @openapi
 * /api/v1/plans/{id}:
 *   put:
 *     summary: Update a plan
 *     description: Update an existing plan. Super Admin only.
 *     tags:
 *       - Plans
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Plan MongoDB ObjectId
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
 *               name:
 *                 type: string
 *               employeeLimit:
 *                 type: number
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               monthlyPrice:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Plan not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin"),
  planController.update,
);

/**
 * @openapi
 * /api/v1/plans/{id}:
 *   delete:
 *     summary: Delete a plan
 *     description: >
 *       Delete a plan by its ID. Super Admin only. Refused with 409 if any
 *       company is still assigned to this plan.
 *     tags:
 *       - Plans
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Plan MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: Plan deleted successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: Plan not found
 *
 *       409:
 *         description: Plan is still assigned to one or more companies
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  planController.destroy,
);

module.exports = router;

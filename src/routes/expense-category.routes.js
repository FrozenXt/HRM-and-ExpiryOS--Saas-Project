const express = require("express");
const expenseCategoryController = require("../controllers/expense-category.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ExpenseCategory:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         name: { type: string, example: "Travel" }
 *         monthlyLimit: { type: number, nullable: true, example: 500 }
 */

/**
 * @openapi
 * /api/v1/expense-categories/list:
 *   post:
 *     summary: Get expense categories
 *     tags: [Expense Categories]
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
 *       200: { description: Expense categories fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseCategoryController.index,
);

/**
 * @openapi
 * /api/v1/expense-categories:
 *   post:
 *     summary: Create an expense category
 *     description: Admin/HR/Super Admin only.
 *     tags: [Expense Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               name: { type: string, example: "Travel" }
 *               monthlyLimit: { type: number, example: 500 }
 *     responses:
 *       201: { description: Expense category created successfully }
 *       400: { description: Invalid data or duplicate name in this company }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expenseCategoryController.store,
);

/**
 * @openapi
 * /api/v1/expense-categories/{id}:
 *   get:
 *     summary: Get an expense category by ID
 *     tags: [Expense Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Expense category fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expense category not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  expenseCategoryController.show,
);

/**
 * @openapi
 * /api/v1/expense-categories/{id}:
 *   put:
 *     summary: Update an expense category
 *     description: Admin/HR/Super Admin only.
 *     tags: [Expense Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               monthlyLimit: { type: number }
 *     responses:
 *       200: { description: Expense category updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expense category not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expenseCategoryController.update,
);

/**
 * @openapi
 * /api/v1/expense-categories/{id}:
 *   delete:
 *     summary: Delete an expense category
 *     description: Refused with 409 if any expense claim references it.
 *     tags: [Expense Categories]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Expense category deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Expense category not found }
 *       409: { description: Category still has claims against it }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  expenseCategoryController.destroy,
);

module.exports = router;

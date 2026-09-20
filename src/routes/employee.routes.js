const express = require("express");

const employeeController = require("../controllers/employee.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         userId: { type: string }
 *         companyId: { type: string }
 *         departmentId: { type: string }
 *         designationId: { type: string }
 *         reportingManagerId: { type: string, nullable: true }
 *         joiningDate: { type: string, format: date }
 *         status: { type: string, enum: [active, inactive] }
 *         dateOfBirth: { type: string, format: date, nullable: true }
 *         personalEmail: { type: string, nullable: true }
 *         emergencyContact:
 *           type: object
 *           properties:
 *             name: { type: string }
 *             phone: { type: string }
 *             relation: { type: string }
 */

/**
 * @openapi
 * /api/v1/employees/me:
 *   get:
 *     summary: Get my own employee profile
 *     description: Any authenticated user with an Employee profile (admin/hr/staff).
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Employee profile fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       404: { description: No employee profile found for this account }
 */
router.get("/me", authenticate, employeeController.me);

/**
 * @openapi
 * /api/v1/employees/list:
 *   post:
 *     summary: Get employees
 *     description: Admin/HR are auto-scoped to their own company. Super Admin sees all.
 *     tags: [Employees]
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
 *       200: { description: Employees fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeController.index,
);

/**
 * @openapi
 * /api/v1/employees:
 *   post:
 *     summary: Create an employee profile for an existing user
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, departmentId, designationId, joiningDate]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               userId: { type: string }
 *               departmentId: { type: string }
 *               designationId: { type: string }
 *               reportingManagerId: { type: string }
 *               joiningDate: { type: string, format: date }
 *               status: { type: string, enum: [active, inactive], default: active }
 *               dateOfBirth: { type: string, format: date }
 *               personalEmail: { type: string }
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   phone: { type: string }
 *                   relation: { type: string }
 *     responses:
 *       201: { description: Employee created successfully }
 *       400: { description: Invalid data, user already has a profile, or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeController.store,
);

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Employee not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeController.show,
);

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   put:
 *     summary: Update an employee
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               departmentId: { type: string }
 *               designationId: { type: string }
 *               reportingManagerId: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *               personalEmail: { type: string }
 *               emergencyContact:
 *                 type: object
 *     responses:
 *       200: { description: Employee updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Employee not found }
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeController.update,
);

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   delete:
 *     summary: Delete an employee
 *     tags: [Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Employee not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeController.destroy,
);

module.exports = router;

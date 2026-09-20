const express = require("express");
const employeeStatutoryDetailController = require("../controllers/employee-statutory-detail.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     EmployeeStatutoryDetail:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         panNumber: { type: string, nullable: true }
 *         aadhaarNumber: { type: string, nullable: true, description: "Masked — only last 4 digits shown" }
 *         uanNumber: { type: string, nullable: true }
 *         pfNumber: { type: string, nullable: true }
 *         esiNumber: { type: string, nullable: true }
 *         bankAccountNumber: { type: string, description: "Masked — only last 4 digits shown" }
 *         ifscCode: { type: string, nullable: true }
 *         bankName: { type: string }
 */

/**
 * @openapi
 * /api/v1/employee-statutory-details/list:
 *   post:
 *     summary: Get employee statutory details
 *     description: >
 *       Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *       aadhaarNumber and bankAccountNumber are never returned in list results.
 *     tags: [Employee Statutory Details]
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
 *       200: { description: Employee statutory details fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  employeeStatutoryDetailController.index,
);

/**
 * @openapi
 * /api/v1/employee-statutory-details:
 *   post:
 *     summary: Create statutory details for an employee
 *     description: Admin/HR/Super Admin only. One record per employee.
 *     tags: [Employee Statutory Details]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, bankAccountNumber, bankName]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               employeeId: { type: string }
 *               panNumber: { type: string }
 *               aadhaarNumber: { type: string, description: "Encrypted at rest" }
 *               uanNumber: { type: string }
 *               pfNumber: { type: string }
 *               esiNumber: { type: string }
 *               bankAccountNumber: { type: string, description: "Encrypted at rest" }
 *               ifscCode: { type: string }
 *               bankName: { type: string }
 *     responses:
 *       201: { description: Employee statutory detail created successfully }
 *       400: { description: Invalid data, missing bank details, or employee already has a record }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeStatutoryDetailController.store,
);

/**
 * @openapi
 * /api/v1/employee-statutory-details/{id}:
 *   get:
 *     summary: Get an employee statutory detail by ID
 *     description: aadhaarNumber/bankAccountNumber are returned masked (last 4 digits only) even here.
 *     tags: [Employee Statutory Details]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee statutory detail fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Employee statutory detail not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  employeeStatutoryDetailController.show,
);

/**
 * @openapi
 * /api/v1/employee-statutory-details/{id}:
 *   put:
 *     summary: Update an employee statutory detail
 *     description: Admin/HR/Super Admin only.
 *     tags: [Employee Statutory Details]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               panNumber: { type: string }
 *               aadhaarNumber: { type: string }
 *               uanNumber: { type: string }
 *               pfNumber: { type: string }
 *               esiNumber: { type: string }
 *               bankAccountNumber: { type: string }
 *               ifscCode: { type: string }
 *               bankName: { type: string }
 *     responses:
 *       200: { description: Employee statutory detail updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Employee statutory detail not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeStatutoryDetailController.update,
);

/**
 * @openapi
 * /api/v1/employee-statutory-details/{id}:
 *   delete:
 *     summary: Delete an employee statutory detail
 *     description: Admin/HR/Super Admin only.
 *     tags: [Employee Statutory Details]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee statutory detail deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Employee statutory detail not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  employeeStatutoryDetailController.destroy,
);

module.exports = router;

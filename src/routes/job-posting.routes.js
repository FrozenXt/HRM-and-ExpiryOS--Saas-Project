const express = require("express");
const jobPostingController = require("../controllers/job-posting.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     JobPosting:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         title: { type: string }
 *         departmentId: { type: string }
 *         designationId: { type: string, nullable: true }
 *         description: { type: string }
 *         requirements:
 *           type: array
 *           items: { type: string }
 *         employmentType: { type: string, enum: [full_time, part_time, contract, intern] }
 *         numberOfOpenings: { type: number, default: 1 }
 *         status: { type: string, enum: [open, on_hold, closed] }
 *         postedBy: { type: string }
 *         closingDate: { type: string, format: date, nullable: true }
 */

/**
 * @openapi
 * /api/v1/job-postings/list:
 *   post:
 *     summary: Get job postings
 *     tags: [Job Postings]
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
 *                     value: { type: string, example: open }
 *     responses:
 *       200: { description: Job postings fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  jobPostingController.index,
);

/**
 * @openapi
 * /api/v1/job-postings:
 *   post:
 *     summary: Create a job posting
 *     description: postedBy is set automatically to the caller. Admin/HR/Super Admin only.
 *     tags: [Job Postings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, departmentId, description, employmentType]
 *             properties:
 *               companyId: { type: string, description: "Required only for super_admin" }
 *               title: { type: string }
 *               departmentId: { type: string }
 *               designationId: { type: string }
 *               description: { type: string }
 *               requirements:
 *                 type: array
 *                 items: { type: string }
 *               employmentType: { type: string, enum: [full_time, part_time, contract, intern] }
 *               numberOfOpenings: { type: number, default: 1 }
 *               status: { type: string, enum: [open, on_hold, closed], default: open }
 *               closingDate: { type: string, format: date }
 *     responses:
 *       201: { description: Job posting created successfully }
 *       400: { description: Invalid data or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  jobPostingController.store,
);

/**
 * @openapi
 * /api/v1/job-postings/{id}:
 *   get:
 *     summary: Get a job posting by ID
 *     tags: [Job Postings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job posting fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Job posting not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  jobPostingController.show,
);

/**
 * @openapi
 * /api/v1/job-postings/{id}:
 *   put:
 *     summary: Update a job posting
 *     tags: [Job Postings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               departmentId: { type: string }
 *               designationId: { type: string }
 *               description: { type: string }
 *               requirements:
 *                 type: array
 *                 items: { type: string }
 *               employmentType: { type: string, enum: [full_time, part_time, contract, intern] }
 *               numberOfOpenings: { type: number }
 *               status: { type: string, enum: [open, on_hold, closed] }
 *               closingDate: { type: string, format: date }
 *     responses:
 *       200: { description: Job posting updated successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Job posting not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  jobPostingController.update,
);

/**
 * @openapi
 * /api/v1/job-postings/{id}:
 *   delete:
 *     summary: Delete a job posting
 *     tags: [Job Postings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job posting deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Job posting not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  jobPostingController.destroy,
);

module.exports = router;

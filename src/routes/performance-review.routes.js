const express = require("express");

const performanceReviewController = require("../controllers/performance-review.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     PerformanceReview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         employeeId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         companyId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         reviewPeriod:
 *           type: string
 *           example: 2026-H1
 *         reviewerId:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         strengths:
 *           type: string
 *         areasOfImprovement:
 *           type: string
 *         status:
 *           type: string
 *           enum:
 *             - draft
 *             - submitted
 *             - acknowledged
 *           example: draft
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/performance-reviews/list:
 *   post:
 *     summary: Get performance reviews
 *     description: >
 *       Staff see only their own review (read-only — they can view it, not
 *       edit it). Admin/HR see the whole company. Super Admin sees all.
 *       Each review's employeeId and reviewerId are populated with names,
 *       so the list doesn't need a follow-up call per row.
 *     tags:
 *       - Performance Reviews
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
 *                 example: DESC
 *               sort_field:
 *                 type: string
 *                 example: reviewPeriod
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
 *                       example: submitted
 *     responses:
 *       200:
 *         description: Performance reviews fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, performanceReviewController.index);

/**
 * @openapi
 * /api/v1/performance-reviews:
 *   post:
 *     summary: Create a performance review
 *     description: >
 *       Admin/HR/Super Admin only — the reviewer authors this, not the
 *       employee being reviewed. reviewerId defaults to the caller if
 *       omitted. One review per employee per reviewPeriod.
 *     tags:
 *       - Performance Reviews
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - reviewPeriod
 *             properties:
 *               employeeId:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 description: Required for super_admin only.
 *               reviewPeriod:
 *                 type: string
 *                 example: 2026-H1
 *               reviewerId:
 *                 type: string
 *                 description: Defaults to the authenticated caller if omitted.
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               strengths:
 *                 type: string
 *               areasOfImprovement:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, acknowledged]
 *     responses:
 *       201:
 *         description: Performance review created successfully
 *       400:
 *         description: Invalid data, or a review already exists for this employee/period
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  performanceReviewController.create,
);

/**
 * @openapi
 * /api/v1/performance-reviews/{id}:
 *   get:
 *     summary: Get a performance review by ID
 *     tags:
 *       - Performance Reviews
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
 *         description: Performance review fetched successfully
 *       404:
 *         description: Performance review not found
 */
router.get("/:id", authenticate, performanceReviewController.show);

/**
 * @openapi
 * /api/v1/performance-reviews/{id}:
 *   patch:
 *     summary: Update a performance review
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Performance Reviews
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
 *               rating:
 *                 type: integer
 *               strengths:
 *                 type: string
 *               areasOfImprovement:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, acknowledged]
 *     responses:
 *       200:
 *         description: Performance review updated successfully
 *       404:
 *         description: Performance review not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  performanceReviewController.update,
);

/**
 * @openapi
 * /api/v1/performance-reviews/{id}:
 *   delete:
 *     summary: Delete a performance review
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Performance Reviews
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
 *         description: Performance review deleted successfully
 *       404:
 *         description: Performance review not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  performanceReviewController.destroy,
);

module.exports = router;

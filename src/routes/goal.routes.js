const express = require("express");

const goalController = require("../controllers/goal.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Goal:
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
 *         title:
 *           type: string
 *           example: Ship the new onboarding flow
 *         description:
 *           type: string
 *           example: Design, build and launch the redesigned onboarding flow.
 *         targetDate:
 *           type: string
 *           format: date
 *           example: 2026-12-31
 *         progress:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           example: 40
 *         status:
 *           type: string
 *           enum:
 *             - not_started
 *             - in_progress
 *             - completed
 *             - missed
 *           example: in_progress
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/goals/list:
 *   post:
 *     summary: Get goals
 *     description: >
 *       Staff see only their own goals. Admin/HR see the whole company.
 *       Super Admin sees all. Each goal's employeeId is populated with the
 *       linked user's name/email and (where set) department/designation
 *       name, so the list doesn't need a follow-up call per row.
 *     tags:
 *       - Goals
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
 *                       example: in_progress
 *     responses:
 *       200:
 *         description: Goals fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, goalController.index);

/**
 * @openapi
 * /api/v1/goals:
 *   post:
 *     summary: Create a goal
 *     description: >
 *       Staff create a goal for themselves (employeeId/companyId are
 *       resolved from the token and any values sent in the body are
 *       ignored). Admin/HR must supply employeeId, for an employee in their
 *       own company. Super Admin must also supply companyId.
 *     tags:
 *       - Goals
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Required for admin/hr/super_admin; ignored for staff.
 *               companyId:
 *                 type: string
 *                 description: Required for super_admin only.
 *               title:
 *                 type: string
 *                 example: Ship the new onboarding flow
 *               description:
 *                 type: string
 *               targetDate:
 *                 type: string
 *                 format: date
 *               progress:
 *                 type: integer
 *                 example: 0
 *               status:
 *                 type: string
 *                 enum: [not_started, in_progress, completed, missed]
 *     responses:
 *       201:
 *         description: Goal created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  goalController.create,
);

/**
 * @openapi
 * /api/v1/goals/{id}:
 *   get:
 *     summary: Get a goal by ID
 *     tags:
 *       - Goals
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
 *         description: Goal fetched successfully
 *       404:
 *         description: Goal not found
 */
router.get("/:id", authenticate, goalController.show);

/**
 * @openapi
 * /api/v1/goals/{id}:
 *   patch:
 *     summary: Update a goal
 *     description: >
 *       Staff may only update their own goal (typically progress/status).
 *       Admin/HR may update any goal in their company. Super Admin any goal.
 *     tags:
 *       - Goals
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               targetDate:
 *                 type: string
 *                 format: date
 *               progress:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [not_started, in_progress, completed, missed]
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *       404:
 *         description: Goal not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  goalController.update,
);

/**
 * @openapi
 * /api/v1/goals/{id}:
 *   delete:
 *     summary: Delete a goal
 *     tags:
 *       - Goals
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
 *         description: Goal deleted successfully
 *       404:
 *         description: Goal not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  goalController.destroy,
);

module.exports = router;

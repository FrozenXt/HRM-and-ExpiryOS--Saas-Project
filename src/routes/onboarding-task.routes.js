const express = require("express");

const onboardingTaskController = require("../controllers/onboarding-task.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     OnboardingTask:
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
 *         taskName:
 *           type: string
 *           example: Set up laptop and email account
 *         category:
 *           type: string
 *           enum: [documentation, it_setup, training, compliance, other]
 *           example: it_setup
 *         assignedTo:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         dueDate:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *           example: pending
 *         completedAt:
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
 * /api/v1/onboarding-tasks/list:
 *   post:
 *     summary: Get onboarding tasks
 *     description: >
 *       Staff see only their own tasks. Admin/HR see the whole company.
 *       Super Admin sees all. employeeId and assignedTo are populated with
 *       names, so the list doesn't need a follow-up call per row.
 *     tags:
 *       - Onboarding Tasks
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
 *                 example: ASC
 *               sort_field:
 *                 type: string
 *                 example: dueDate
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
 *                       example: pending
 *     responses:
 *       200:
 *         description: Onboarding tasks fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, onboardingTaskController.index);

/**
 * @openapi
 * /api/v1/onboarding-tasks:
 *   post:
 *     summary: Create an onboarding task
 *     description: >
 *       Admin/HR/Super Admin only. Super Admin must supply companyId;
 *       admin/hr's companyId is resolved from their own token.
 *     tags:
 *       - Onboarding Tasks
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
 *               - taskName
 *             properties:
 *               employeeId:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 description: Required for super_admin only.
 *               taskName:
 *                 type: string
 *                 example: Set up laptop and email account
 *               category:
 *                 type: string
 *                 enum: [documentation, it_setup, training, compliance, other]
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *     responses:
 *       201:
 *         description: Onboarding task created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  onboardingTaskController.create,
);

/**
 * @openapi
 * /api/v1/onboarding-tasks/{id}:
 *   get:
 *     summary: Get an onboarding task by ID
 *     tags:
 *       - Onboarding Tasks
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
 *         description: Onboarding task fetched successfully
 *       404:
 *         description: Onboarding task not found
 */
router.get("/:id", authenticate, onboardingTaskController.show);

/**
 * @openapi
 * /api/v1/onboarding-tasks/{id}:
 *   patch:
 *     summary: Update an onboarding task
 *     description: >
 *       Staff may update their own task (typically to mark it in_progress
 *       or completed — completedAt is set automatically). Admin/HR/Super
 *       Admin may update any task in scope.
 *     tags:
 *       - Onboarding Tasks
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
 *               taskName:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [documentation, it_setup, training, compliance, other]
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *     responses:
 *       200:
 *         description: Onboarding task updated successfully
 *       404:
 *         description: Onboarding task not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  onboardingTaskController.update,
);

/**
 * @openapi
 * /api/v1/onboarding-tasks/{id}:
 *   delete:
 *     summary: Delete an onboarding task
 *     description: Admin/HR/Super Admin only.
 *     tags:
 *       - Onboarding Tasks
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
 *         description: Onboarding task deleted successfully
 *       404:
 *         description: Onboarding task not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  onboardingTaskController.destroy,
);

module.exports = router;

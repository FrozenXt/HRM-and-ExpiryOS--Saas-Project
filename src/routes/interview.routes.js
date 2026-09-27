const express = require("express");

const interviewController = require("../controllers/interview.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Interview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68e1234567890abcdef1234
 *         candidateId:
 *           description: Populated candidate object in responses.
 *           oneOf:
 *             - type: string
 *               example: 68a1234567890abcdef1234
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 firstName: { type: string, example: Amrita }
 *                 lastName: { type: string, example: Malla }
 *                 email: { type: string, format: email, example: amrita@example.com }
 *                 phone: { type: string, example: "+977-9800000000" }
 *                 status: { type: string, example: interviewing }
 *         companyId:
 *           description: Populated company object in responses.
 *           oneOf:
 *             - type: string
 *               example: 68b1234567890abcdef1234
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 legalName: { type: string, example: Acme Pvt Ltd }
 *                 tradeName: { type: string, example: Acme }
 *                 logoUrl: { type: string, nullable: true }
 *         round:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         interviewerIds:
 *           description: Populated user objects in responses.
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *               - type: object
 *                 properties:
 *                   _id: { type: string }
 *                   firstName: { type: string, example: Rahul }
 *                   lastName: { type: string, example: Sharma }
 *                   email: { type: string, format: email }
 *                   role: { type: string, enum: [super_admin, admin, hr, staff] }
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           example: 2026-09-28T10:00:00.000Z
 *         mode:
 *           type: string
 *           enum: [in_person, video, phone]
 *           example: video
 *         feedback:
 *           type: string
 *           nullable: true
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [scheduled, completed, cancelled, no_show]
 *           example: scheduled
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/interviews/list:
 *   post:
 *     summary: Get interviews
 *     description: >-
 *       Paginated, filtered list of interviews. Super Admin sees all companies
 *       (optionally filtered by companyId); Admin/HR see only their own
 *       company. Every ObjectId in the response is populated with the
 *       referenced document's basic fields (name, email, etc.).
 *     tags:
 *       - Interviews
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
 *                 minimum: 1
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *               sort:
 *                 type: string
 *                 enum: [ASC, DESC]
 *                 example: DESC
 *               sort_field:
 *                 type: string
 *                 example: scheduledAt
 *               fields:
 *                 type: array
 *                 description: List of filters to apply.
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: status
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
 *                       example: eq
 *                     value:
 *                       type: string
 *                       example: scheduled
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: DESC
 *             sort_field: scheduledAt
 *             fields:
 *               - field: status
 *                 operator: eq
 *                 value: scheduled
 *               - field: mode
 *                 operator: eq
 *                 value: video
 *     responses:
 *       200:
 *         description: Interviews fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Interviews fetched successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Interview' }
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: integer, example: 1 }
 *                         limit: { type: integer, example: 20 }
 *                         total: { type: integer, example: 43 }
 *                         total_pages: { type: integer, example: 3 }
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  interviewController.index,
);

/**
 * @openapi
 * /api/v1/interviews:
 *   post:
 *     summary: Schedule a new interview
 *     description: >-
 *       Creates an interview round for a candidate. Admin/HR are automatically
 *       scoped to their own company — the companyId field is ignored for them.
 *       Super Admin must supply companyId.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateId
 *               - round
 *               - interviewerIds
 *               - scheduledAt
 *               - mode
 *             properties:
 *               candidateId:
 *                 type: string
 *                 example: 68a1234567890abcdef1234
 *               companyId:
 *                 type: string
 *                 description: Required only for super_admin.
 *                 example: 68b1234567890abcdef1234
 *               round:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               interviewerIds:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                 example: ["68c1234567890abcdef1234", "68c1234567890abcdef5678"]
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-28T10:00:00.000Z
 *               mode:
 *                 type: string
 *                 enum: [in_person, video, phone]
 *                 example: video
 *               feedback:
 *                 type: string
 *                 nullable: true
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, cancelled, no_show]
 *                 default: scheduled
 *     responses:
 *       201:
 *         description: Interview scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Interview scheduled successfully }
 *                 data: { $ref: '#/components/schemas/Interview' }
 *       400:
 *         description: Invalid request data or missing required fields
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  interviewController.store,
);

/**
 * @openapi
 * /api/v1/interviews/{id}:
 *   get:
 *     summary: Get an interview by ID
 *     description: Returns a single interview with all references populated.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Interview MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68e1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Interview fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Interview fetched successfully }
 *                 data: { $ref: '#/components/schemas/Interview' }
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Interview not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  interviewController.show,
);

/**
 * @openapi
 * /api/v1/interviews/{id}:
 *   put:
 *     summary: Update an interview
 *     description: >-
 *       Partial update of an interview. Ownership fields (candidateId,
 *       companyId) cannot be reassigned. Typically used to record feedback,
 *       rating, or to move status between scheduled/completed/cancelled/no_show.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Interview MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68e1234567890abcdef1234
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               round: { type: integer, minimum: 1 }
 *               interviewerIds:
 *                 type: array
 *                 items: { type: string }
 *               scheduledAt: { type: string, format: date-time }
 *               mode: { type: string, enum: [in_person, video, phone] }
 *               feedback: { type: string, nullable: true }
 *               rating: { type: integer, minimum: 1, maximum: 5, nullable: true }
 *               status: { type: string, enum: [scheduled, completed, cancelled, no_show] }
 *           example:
 *             status: completed
 *             feedback: Strong fundamentals, good communication.
 *             rating: 4
 *     responses:
 *       200:
 *         description: Interview updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Interview updated successfully }
 *                 data: { $ref: '#/components/schemas/Interview' }
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Interview not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  interviewController.update,
);

/**
 * @openapi
 * /api/v1/interviews/{id}:
 *   delete:
 *     summary: Delete an interview
 *     description: Permanently deletes an interview record.
 *     tags:
 *       - Interviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Interview MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68e1234567890abcdef1234
 *     responses:
 *       200:
 *         description: Interview deleted successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Interview not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  interviewController.destroy,
);

module.exports = router;

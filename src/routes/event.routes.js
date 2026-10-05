const express = require("express");

const eventController = require("../controllers/event.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 68f1234567890abcdef1234 }
 *         companyId:
 *           oneOf:
 *             - { type: string }
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 legalName: { type: string }
 *                 tradeName: { type: string }
 *                 logoUrl: { type: string, nullable: true }
 *         type: { type: string, enum: [birthday, work_anniversary, company_event, meeting, other] }
 *         title: { type: string, example: "Team offsite" }
 *         employeeId:
 *           nullable: true
 *           oneOf:
 *             - { type: string }
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 id_int: { type: number }
 *                 userId:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     firstName: { type: string }
 *                     lastName: { type: string }
 *                     email: { type: string, format: email }
 *                     role: { type: string }
 *                 departmentId:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     name: { type: string }
 *                 designationId:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     name: { type: string }
 *         date: { type: string, format: date-time, example: "2026-10-05T00:00:00.000Z" }
 *         description: { type: string, nullable: true }
 *         isRecurringYearly: { type: boolean, example: false }
 *         createdBy:
 *           nullable: true
 *           oneOf:
 *             - { type: string }
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 firstName: { type: string }
 *                 lastName: { type: string }
 *                 email: { type: string, format: email }
 *                 role: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /api/v1/events/list:
 *   post:
 *     summary: Get events
 *     description: Paginated, filtered list of events. Admin/HR scoped to their company.
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 20 }
 *               sort: { type: string, enum: [ASC, DESC], example: ASC }
 *               sort_field: { type: string, example: date }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: type }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: birthday }
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: ASC
 *             sort_field: date
 *             fields:
 *               - field: type
 *                 operator: eq
 *                 value: company_event
 *     responses:
 *       200: { description: Events fetched successfully }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  eventController.index,
);

/**
 * @openapi
 * /api/v1/events:
 *   post:
 *     summary: Create an event
 *     description: >
 *       For type=birthday or work_anniversary, employeeId is required.
 *       For company_event / meeting / other, employeeId may be null.
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, title, date]
 *             properties:
 *               type: { type: string, enum: [birthday, work_anniversary, company_event, meeting, other] }
 *               title: { type: string }
 *               employeeId: { type: string, nullable: true }
 *               date: { type: string, format: date-time }
 *               description: { type: string, nullable: true }
 *               isRecurringYearly: { type: boolean, default: false }
 *               companyId: { type: string, description: "Required only for super_admin" }
 *           example:
 *             type: company_event
 *             title: Team offsite
 *             date: "2026-10-05T00:00:00.000Z"
 *             description: Annual team building event
 *             isRecurringYearly: false
 *     responses:
 *       201: { description: Event created successfully }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  eventController.store,
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   get:
 *     summary: Get an event by ID
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Event fetched successfully }
 *       404: { description: Event not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  eventController.show,
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [birthday, work_anniversary, company_event, meeting, other] }
 *               title: { type: string }
 *               employeeId: { type: string, nullable: true }
 *               date: { type: string, format: date-time }
 *               description: { type: string, nullable: true }
 *               isRecurringYearly: { type: boolean }
 *     responses:
 *       200: { description: Event updated successfully }
 *       400: { description: Validation error }
 *       404: { description: Event not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  eventController.update,
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Event deleted successfully }
 *       404: { description: Event not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  eventController.destroy,
);

module.exports = router;

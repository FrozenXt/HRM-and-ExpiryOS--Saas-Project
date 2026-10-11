const express = require("express");
const supportTicketController = require("../controllers/support-ticket.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  attachments,
} = require("../middlewares/support-ticket-upload.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SupportTicket:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         ticketNo: { type: string, example: TKT-00012 }
 *         subject: { type: string }
 *         category: { type: string, enum: [technical, billing, account, attendance, payroll, leave, hr_query, it_support, feature_request, other] }
 *         priority: { type: string, enum: [low, medium, high, urgent] }
 *         status: { type: string, enum: [open, in_progress, waiting_on_requester, resolved, closed] }
 *         target: { type: string, enum: [platform, company] }
 *         company: { type: object, description: "{ _id, name, logo }" }
 *         requester: { type: object, description: "{ _id, name, email, role, profileImage }" }
 *         assignee: { type: object, nullable: true }
 *         commentCount: { type: integer }
 *         attachmentCount: { type: integer }
 *         lastActivityAt: { type: string, format: date-time }
 *         permissions: { type: object, description: "canReply, canChangeStatus, canAssign, canClose, canReopen, canDelete ..." }
 */

/**
 * @openapi
 * /api/v1/support-tickets/list:
 *   post:
 *     summary: Get support tickets
 *     description: |
 *       Paginated, filtered list. Staff see only their own tickets, HR see
 *       staff tickets of their company plus their own, Admin see every ticket
 *       of their company, Super Admin see platform tickets from all companies.
 *       The response also carries `summary` counts (by status / priority /
 *       category, unassigned, urgent) so no extra stats call is needed.
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 20 }
 *               sort: { type: string, enum: [ASC, DESC] }
 *               sort_field: { type: string, example: lastActivityAt }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: status }
 *                     operator: { type: string, enum: [eq, ne, gt, gte, lt, lte, contains, starts_with, ends_with, in] }
 *                     value: { type: string }
 *     responses:
 *       200: { description: Support tickets fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  supportTicketController.index,
);

/**
 * @openapi
 * /api/v1/support-tickets/options:
 *   get:
 *     summary: Dropdown data for the ticket form and filters
 *     description: Statuses, priorities, categories, where a new ticket will go, and the users a ticket can be assigned to.
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Support ticket options fetched }
 */
router.get(
  "/options",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  supportTicketController.options,
);

/**
 * @openapi
 * /api/v1/support-tickets:
 *   post:
 *     summary: Raise a support ticket
 *     description: |
 *       Staff -> goes to the admin and HR of their company.
 *       Admin / HR -> goes to platform support (super admin).
 *       Send JSON, or multipart/form-data with up to 5 files in `attachments`
 *       (5 MB each: images, pdf, doc/docx, xls/xlsx, csv, txt).
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [subject, description]
 *             properties:
 *               subject: { type: string }
 *               description: { type: string }
 *               category: { type: string, default: other }
 *               priority: { type: string, enum: [low, medium, high, urgent], default: medium }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Support ticket created successfully }
 *       400: { description: Invalid data or file }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr", "staff"),
  attachments,
  supportTicketController.store,
);

/**
 * @openapi
 * /api/v1/support-tickets/{id}/comments:
 *   post:
 *     summary: Reply on a ticket
 *     description: |
 *       Multipart or JSON. `message` and/or `attachments`. Responders can set
 *       `isInternal=true` for a note the requester cannot see. A responder's
 *       first public reply moves an open ticket to in_progress and assigns it
 *       to them if nobody has it yet.
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string }
 *               isInternal: { type: boolean }
 *               attachments:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Reply added successfully }
 *       400: { description: Ticket closed, or empty reply }
 *       404: { description: Support ticket not found }
 */
router.post(
  "/:id/comments",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  attachments,
  supportTicketController.comment,
);

/**
 * @openapi
 * /api/v1/support-tickets/{id}:
 *   get:
 *     summary: Get a support ticket (with replies, attachments and history)
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Support ticket fetched successfully }
 *       404: { description: Support ticket not found }
 *   put:
 *     summary: Update a support ticket
 *     description: |
 *       Responders: status, priority, category, assignedTo, resolutionNote.
 *       Requester: only close (status=closed) or reopen (status=open).
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [open, in_progress, waiting_on_requester, resolved, closed] }
 *               priority: { type: string, enum: [low, medium, high, urgent] }
 *               category: { type: string }
 *               assignedTo: { type: string, nullable: true }
 *               resolutionNote: { type: string }
 *     responses:
 *       200: { description: Support ticket updated successfully }
 *       403: { description: Insufficient permissions }
 *       404: { description: Support ticket not found }
 *   delete:
 *     summary: Delete a support ticket
 *     description: Super admin (platform tickets), or the requester while it is still open and has no replies.
 *     tags: [Support Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Support ticket deleted successfully }
 *       403: { description: Insufficient permissions }
 *       404: { description: Support ticket not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  supportTicketController.show,
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  supportTicketController.update,
);
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  supportTicketController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  supportTicketController.destroy,
);

module.exports = router;

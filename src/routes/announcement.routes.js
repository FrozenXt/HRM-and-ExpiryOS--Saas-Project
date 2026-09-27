const express = require("express");

const announcementController = require("../controllers/announcement.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       properties:
 *         _id: { type: string, example: 68f1234567890abcdef5678 }
 *         companyId:
 *           oneOf:
 *             - { type: string }
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 legalName: { type: string }
 *                 tradeName: { type: string }
 *                 logoUrl: { type: string, nullable: true }
 *         title: { type: string, example: "Office closed on Monday" }
 *         message: { type: string }
 *         audience: { type: string, enum: [all, department, role] }
 *         departmentId:
 *           nullable: true
 *           oneOf:
 *             - { type: string }
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 name: { type: string }
 *         attachmentUrl: { type: string, nullable: true }
 *         postedBy:
 *           oneOf:
 *             - { type: string }
 *             - type: object
 *               properties:
 *                 _id: { type: string }
 *                 firstName: { type: string }
 *                 lastName: { type: string }
 *                 email: { type: string, format: email }
 *                 role: { type: string }
 *         publishedAt: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /api/v1/announcements/list:
 *   post:
 *     summary: Get announcements (admin/HR view)
 *     description: Paginated, filtered list of all announcements for the company.
 *     tags: [Announcements]
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
 *               sort: { type: string, enum: [ASC, DESC], example: DESC }
 *               sort_field: { type: string, example: publishedAt }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: audience }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: all }
 *     responses:
 *       200: { description: Announcements fetched successfully }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  announcementController.index,
);

/**
 * @openapi
 * /api/v1/announcements/my-feed:
 *   post:
 *     summary: Get announcements visible to me
 *     description: >
 *       Returns announcements whose audience matches the logged-in user
 *       (all / their department / their role).
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: integer, example: 1 }
 *               limit: { type: integer, example: 20 }
 *     responses:
 *       200: { description: Announcements fetched successfully }
 *       401: { description: Authentication required }
 */
router.post(
  "/my-feed",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  announcementController.myFeed,
);

/**
 * @openapi
 * /api/v1/announcements:
 *   post:
 *     summary: Create an announcement
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message, audience]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               audience: { type: string, enum: [all, department, role] }
 *               departmentId: { type: string, description: "Required when audience=department" }
 *               attachmentUrl: { type: string, nullable: true }
 *               publishedAt: { type: string, format: date-time }
 *               companyId: { type: string, description: "Required only for super_admin" }
 *           example:
 *             title: Office closed on Monday
 *             message: In observance of the holiday, the office will remain closed.
 *             audience: all
 *     responses:
 *       201: { description: Announcement created successfully }
 *       400: { description: Validation error }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  announcementController.store,
);

/**
 * @openapi
 * /api/v1/announcements/{id}:
 *   get:
 *     summary: Get an announcement by ID
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Announcement fetched successfully }
 *       404: { description: Announcement not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  announcementController.show,
);

/**
 * @openapi
 * /api/v1/announcements/{id}:
 *   put:
 *     summary: Update an announcement
 *     tags: [Announcements]
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
 *               message: { type: string }
 *               audience: { type: string, enum: [all, department, role] }
 *               departmentId: { type: string, nullable: true }
 *               attachmentUrl: { type: string, nullable: true }
 *     responses:
 *       200: { description: Announcement updated successfully }
 *       400: { description: Validation error }
 *       404: { description: Announcement not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  announcementController.update,
);

/**
 * @openapi
 * /api/v1/announcements/{id}:
 *   delete:
 *     summary: Delete an announcement
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Announcement deleted successfully }
 *       404: { description: Announcement not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  announcementController.destroy,
);

module.exports = router;

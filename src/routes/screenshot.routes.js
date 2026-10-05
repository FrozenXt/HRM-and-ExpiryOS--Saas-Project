const express = require("express");
const screenshotController = require("../controllers/screenshot.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  buildUploader,
  handleUploadErrors,
} = require("../middlewares/upload.middleware");

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const uploadScreenshot = handleUploadErrors(
  buildUploader("screenshots", IMAGE_TYPES).single("file"),
);

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Screenshot:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         employeeId: { type: string }
 *         companyId: { type: string }
 *         sessionId: { type: string }
 *         capturedAt: { type: string, format: date-time }
 *         fileUrl: { type: string }
 *         isBlurred: { type: boolean, default: false }
 *         isFlagged: { type: boolean, default: false }
 *         activeAppName: { type: string, nullable: true }
 */

/**
 * @openapi
 * /api/v1/screenshots/list:
 *   post:
 *     summary: Get screenshots
 *     description: Staff see only their own. Admin/HR see the whole company. Super Admin sees all.
 *     tags: [Screenshots]
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
 *               sort_field: { type: string, example: capturedAt }
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string, example: isFlagged }
 *                     operator: { type: string, example: eq }
 *                     value: { type: string, example: "true" }
 *     responses:
 *       200: { description: Screenshots fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  screenshotController.index,
);

/**
 * @openapi
 * /api/v1/screenshots:
 *   post:
 *     summary: Upload a screenshot
 *     description: >
 *       Sent by the employee's own device agent. Always recorded against the
 *       caller's own employee profile, and rejected with 403 unless their latest
 *       monitoring consent is "given". isFlagged can't be set here.
 *     tags: [Screenshots]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [sessionId, file]
 *             properties:
 *               sessionId: { type: string }
 *               capturedAt: { type: string, format: date-time }
 *               isBlurred: { type: boolean, default: false }
 *               activeAppName: { type: string }
 *               file: { type: string, format: binary, description: "PNG, JPEG or WEBP, max 10 MB" }
 *     responses:
 *       201: { description: Screenshot uploaded successfully }
 *       400: { description: Missing file/sessionId, unsupported type, or no employee profile }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Monitoring consent has not been given }
 */
router.post(
  "/",
  authenticate,
  authorize("admin", "hr", "staff"),
  uploadScreenshot,
  screenshotController.store,
);

/**
 * @openapi
 * /api/v1/screenshots/{id}:
 *   get:
 *     summary: Get a screenshot by ID
 *     tags: [Screenshots]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Screenshot fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Screenshot not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr", "staff"),
  screenshotController.show,
);

/**
 * @openapi
 * /api/v1/screenshots/{id}/flag:
 *   put:
 *     summary: Flag or unflag a screenshot
 *     description: Admin/HR/Super Admin only.
 *     tags: [Screenshots]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isFlagged]
 *             properties:
 *               isFlagged: { type: boolean }
 *     responses:
 *       200: { description: Screenshot flag updated successfully }
 *       400: { description: isFlagged must be true or false }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Screenshot not found }
 */
router.put(
  "/:id/flag",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  screenshotController.flag,
);

/**
 * @openapi
 * /api/v1/screenshots/{id}:
 *   delete:
 *     summary: Delete a screenshot
 *     description: Admin/HR/Super Admin only. Also removes the image file from disk.
 *     tags: [Screenshots]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Screenshot deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Screenshot not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  screenshotController.destroy,
);

module.exports = router;

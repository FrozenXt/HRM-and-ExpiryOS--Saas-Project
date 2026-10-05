const express = require("express");

const savedReportViewController = require("../controllers/saved-report-view.controller");
const authenticate = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SavedReportView:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         companyId:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *           example: Late arrivals this quarter
 *         filters:
 *           type: object
 *           example: { status: "late", dateRange: "last_90_days" }
 */

/**
 * @openapi
 * /api/v1/saved-report-views/list:
 *   post:
 *     summary: Get your saved report views
 *     description: >
 *       Always scoped to the caller — every role, including super_admin,
 *       only ever sees their own saved views.
 *     tags:
 *       - Saved Report Views
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
 *     responses:
 *       200:
 *         description: Saved report views fetched successfully
 *       401:
 *         description: Authentication required or invalid access token
 */
router.post("/list", authenticate, savedReportViewController.index);

/**
 * @openapi
 * /api/v1/saved-report-views:
 *   post:
 *     summary: Save a report view
 *     description: userId/companyId are taken from the token.
 *     tags:
 *       - Saved Report Views
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Late arrivals this quarter
 *               filters:
 *                 type: object
 *     responses:
 *       201:
 *         description: Saved report view created successfully
 *       400:
 *         description: Invalid data
 */
router.post("/", authenticate, savedReportViewController.create);

/**
 * @openapi
 * /api/v1/saved-report-views/{id}:
 *   get:
 *     summary: Get one of your saved report views by ID
 *     tags:
 *       - Saved Report Views
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
 *         description: Saved report view fetched successfully
 *       404:
 *         description: Saved report view not found
 */
router.get("/:id", authenticate, savedReportViewController.show);

/**
 * @openapi
 * /api/v1/saved-report-views/{id}:
 *   patch:
 *     summary: Update one of your saved report views
 *     tags:
 *       - Saved Report Views
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
 *               name:
 *                 type: string
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Saved report view updated successfully
 *       404:
 *         description: Saved report view not found
 */
router.patch("/:id", authenticate, savedReportViewController.update);

/**
 * @openapi
 * /api/v1/saved-report-views/{id}:
 *   delete:
 *     summary: Delete one of your saved report views
 *     tags:
 *       - Saved Report Views
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
 *         description: Saved report view deleted successfully
 *       404:
 *         description: Saved report view not found
 */
router.delete("/:id", authenticate, savedReportViewController.destroy);

module.exports = router;

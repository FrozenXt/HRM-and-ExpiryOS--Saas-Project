const express = require("express");
const candidateController = require("../controllers/candidate.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const {
  buildUploader,
  handleUploadErrors,
} = require("../middlewares/upload.middleware");

const RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const uploadResume = handleUploadErrors(
  buildUploader("resumes", RESUME_TYPES).single("resume"),
);

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Candidate:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         id_int: { type: number }
 *         companyId: { type: string }
 *         jobPostingId: { type: string }
 *         name: { type: string }
 *         email: { type: string }
 *         phone: { type: string }
 *         resumeUrl: { type: string }
 *         coverLetter: { type: string, nullable: true }
 *         source: { type: string, enum: [referral, job_portal, linkedin, walk_in, other], nullable: true }
 *         status: { type: string, enum: [applied, shortlisted, interview_scheduled, interviewed, offered, hired, rejected, withdrawn] }
 *         referredBy: { type: string, nullable: true }
 *         appliedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /api/v1/candidates/list:
 *   post:
 *     summary: Get candidates
 *     tags: [Candidates]
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
 *                     value: { type: string, example: shortlisted }
 *     responses:
 *       200: { description: Candidates fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  candidateController.index,
);

/**
 * @openapi
 * /api/v1/candidates:
 *   post:
 *     summary: Add a candidate (with resume upload)
 *     tags: [Candidates]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [jobPostingId, name, email, phone, resume]
 *             properties:
 *               jobPostingId: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               coverLetter: { type: string }
 *               source: { type: string, enum: [referral, job_portal, linkedin, walk_in, other] }
 *               referredBy: { type: string, description: "Employee _id, for referral source" }
 *               resume: { type: string, format: binary, description: "PDF or Word doc, max 10 MB" }
 *     responses:
 *       201: { description: Candidate created successfully }
 *       400: { description: Invalid data, missing resume, or cross-company reference }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  uploadResume,
  candidateController.store,
);

/**
 * @openapi
 * /api/v1/candidates/{id}:
 *   get:
 *     summary: Get a candidate by ID
 *     tags: [Candidates]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Candidate fetched successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Candidate not found }
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  candidateController.show,
);

/**
 * @openapi
 * /api/v1/candidates/{id}:
 *   put:
 *     summary: Update a candidate (e.g. move through the hiring pipeline)
 *     tags: [Candidates]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               coverLetter: { type: string }
 *               source: { type: string, enum: [referral, job_portal, linkedin, walk_in, other] }
 *               referredBy: { type: string }
 *               status: { type: string, enum: [applied, shortlisted, interview_scheduled, interviewed, offered, hired, rejected, withdrawn] }
 *     responses:
 *       200: { description: Candidate updated successfully }
 *       400: { description: Invalid status value }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Candidate not found }
 */
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  candidateController.update,
);

/**
 * @openapi
 * /api/v1/candidates/{id}:
 *   delete:
 *     summary: Delete a candidate
 *     tags: [Candidates]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Candidate deleted successfully }
 *       401: { description: Authentication required or invalid access token }
 *       403: { description: Insufficient permissions }
 *       404: { description: Candidate not found }
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  candidateController.destroy,
);

module.exports = router;

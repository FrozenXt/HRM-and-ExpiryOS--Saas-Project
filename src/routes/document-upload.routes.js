const express = require("express");
const {
  buildUploader,
  handleUploadErrors,
} = require("../middlewares/upload.middleware");
const { successResponse, errorResponse } = require("../utils/api-response");
// const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

// PDF/PNG/JPEG/WEBP, 10 MB max -> /uploads/company-documents/<file>
const docUpload = handleUploadErrors(
  buildUploader("company-documents", { maxSizeMb: 10 }).single("file"),
);

// POST /api/v1/uploads/document  (multipart/form-data, field name: "file")
router.post("/document", /* authenticate, */ docUpload, (req, res) => {
  if (!req.file) return errorResponse(res, "No file uploaded", 400);

  return successResponse(
    res,
    "File uploaded successfully",
    {
      url: `/uploads/company-documents/${req.file.filename}`,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
    201,
  );
});

module.exports = router;

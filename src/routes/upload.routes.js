const express = require("express");
const {
  buildUploader,
  handleUploadErrors,
} = require("../middlewares/upload.middleware");
const { successResponse, errorResponse } = require("../utils/api-response");
// const { authenticate } = require("../middlewares/auth.middleware"); // your real auth middleware

const router = express.Router();

// Images only, 2 MB max -> /uploads/logos/<file>
const logoUpload = handleUploadErrors(
  buildUploader("logos", {
    allowed: ["image/png", "image/jpeg", "image/webp"],
    maxSizeMb: 2,
  }).single("logo"),
);

// POST /api/v1/uploads/logo  (multipart/form-data, field name: "logo")
router.post(
  "/logo",
  // authenticate,
  logoUpload,
  (req, res) => {
    if (!req.file) return errorResponse(res, "No file uploaded", 400);

    return successResponse(
      res,
      "Logo uploaded successfully",
      { url: `/uploads/logos/${req.file.filename}` },
      201,
    );
  },
);

module.exports = router;

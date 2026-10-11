const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { errorResponse } = require("../utils/api-response");

// <project>/uploads/support-tickets  (served by app.use("/uploads", ...))
const UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "support-tickets",
);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB each
const MAX_FILES = 5;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) =>
    ALLOWED_MIME.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`File type not allowed: ${file.originalname}`)),
});

// Field name: "attachments" (multiple). JSON requests without files still work.
const attachments = (req, res, next) =>
  upload.array("attachments", MAX_FILES)(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Each file must be 5 MB or smaller"
          : err.code === "LIMIT_FILE_COUNT" ||
              err.code === "LIMIT_UNEXPECTED_FILE"
            ? `You can attach up to ${MAX_FILES} files`
            : err.message;
      return errorResponse(res, message, 400);
    }
    next();
  });

// Remove files multer just saved (used when validation fails afterwards).
const unlinkFiles = (files = []) =>
  files.forEach((f) => fs.unlink(f.path, () => {}));

// Remove stored files by their fileUrl (used when a ticket is deleted).
const unlinkUrls = (urls = []) =>
  urls.forEach((u) =>
    fs.unlink(path.join(UPLOAD_DIR, path.basename(u)), () => {}),
  );

module.exports = { attachments, unlinkFiles, unlinkUrls };

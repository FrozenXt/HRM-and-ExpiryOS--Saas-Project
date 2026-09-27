const fs = require("fs");
const path = require("path");
const multer = require("multer");

const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

// Local disk storage — files land under /uploads/<subfolder>/, served
// statically (see app.js: app.use("/uploads", express.static(...))).
// For production behind multiple instances/containers, swap this
// storage engine for an S3 (or similar) one — the rest of the app only
// ever deals with the resulting fileUrl string, so nothing else changes.
//
// allowedMimeTypes: optional override for callers that need a different
// file-type set than the default (e.g. Candidate resumes also accepting
// .doc/.docx, which the default set doesn't include).
function buildUploader(subfolder, allowedMimeTypes = DEFAULT_ALLOWED_TYPES) {
  const uploadDir = path.join(__dirname, "..", "..", "uploads", subfolder);

  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });
}

// A multer error (bad file type, too large) throws before req.user exists
// and isn't shaped like the rest of the app's errors — normalize it here
// so every upload route gets the same { success, message } response shape.
function handleUploadErrors(uploaderMiddleware) {
  return (req, res, next) => {
    uploaderMiddleware(req, res, (error) => {
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      next();
    });
  };
}

module.exports = { buildUploader, handleUploadErrors };

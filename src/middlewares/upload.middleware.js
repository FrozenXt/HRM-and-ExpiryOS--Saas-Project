const fs = require("fs");
const path = require("path");
const multer = require("multer");

const DEFAULT_ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

// Extension comes from the verified mimetype, not the client's filename.
const EXT_BY_MIME = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

// Local disk storage — files land under /uploads/<subfolder>/, served
// statically (see app.js: app.use("/uploads", express.static(...))).
// For production behind multiple instances/containers, swap this
// storage engine for an S3 (or similar) one — the rest of the app only
// ever deals with the resulting fileUrl string, so nothing else changes.
//
// Optional 2nd arg (existing callers are unaffected):
//   buildUploader("logos", { allowed: ["image/png"], maxSizeMb: 2 })
function buildUploader(
  subfolder,
  { allowed = DEFAULT_ALLOWED, maxSizeMb = 10 } = {},
) {
  const uploadDir = path.join(__dirname, "..", "..", "uploads", subfolder);

  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext =
        EXT_BY_MIME[file.mimetype] ||
        path.extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (!allowed.includes(file.mimetype)) {
      const names = allowed
        .map((m) => (EXT_BY_MIME[m] || m).replace(".", "").toUpperCase())
        .join(", ");
      return cb(new Error(`Only ${names} files are allowed`));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
  });
}

// A multer error (bad file type, too large) throws before req.user exists
// and isn't shaped like the rest of the app's errors — normalize it here
// so every upload route gets the same { success, message } response shape.
function handleUploadErrors(uploaderMiddleware) {
  return (req, res, next) => {
    uploaderMiddleware(req, res, (error) => {
      if (error) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "File is too large"
            : error.message;
        return res.status(400).json({ success: false, message });
      }
      next();
    });
  };
}

module.exports = { buildUploader, handleUploadErrors };

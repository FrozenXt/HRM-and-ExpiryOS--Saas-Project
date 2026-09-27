// D:\node api\src\routes\upload.routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

/* ---------------- storage ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "..", "uploads", "misc");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* ---------------- allowed extensions ---------------- */
const DOC_EXT = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

const LOGO_EXT = [".png", ".jpg", ".jpeg", ".webp"];

/* ---------------- helpers ---------------- */
function extOf(file) {
  return path.extname(file.originalname).trim().toLowerCase();
}

function ensureAllowed(req, res, allowed) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return null;
  }
  const ext = extOf(file);
  if (!allowed.includes(ext)) {
    // clean up the rejected file from disk
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
    res.status(400).json({
      success: false,
      message: `Unsupported file extension: ${ext}. Allowed: ${allowed.join(", ")}`,
    });
    return null;
  }
  return file;
}

/* ---------------- routes ---------------- */
router.post("/document", upload.single("file"), (req, res) => {
  const file = ensureAllowed(req, res, DOC_EXT);
  if (!file) return;

  res.json({
    success: true,
    data: {
      url: `/uploads/misc/${file.filename}`,
      fileName: file.originalname,
    },
  });
});

router.post("/logo", upload.single("file"), (req, res) => {
  const file = ensureAllowed(req, res, LOGO_EXT);
  if (!file) return;

  res.json({
    success: true,
    data: { url: `/uploads/misc/${file.filename}` },
  });
});

router.post("/document", upload.single("file"), (req, res) => {
  console.log(">>> HIT /document  |  originalname:", req.file?.originalname);
  const file = ensureAllowed(req, res, DOC_EXT);
  if (!file) return;
  res.json({
    success: true,
    data: {
      url: `/uploads/misc/${file.filename}`,
      fileName: file.originalname,
    },
  });
});

router.post("/logo", upload.single("file"), (req, res) => {
  console.log(">>> HIT /logo      |  originalname:", req.file?.originalname);
  const file = ensureAllowed(req, res, LOGO_EXT);
  if (!file) return;
  res.json({ success: true, data: { url: `/uploads/misc/${file.filename}` } });
});

module.exports = router;

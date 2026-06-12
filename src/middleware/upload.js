import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";

// ─── Directories ──────────────────────────────────────────────────────────────

const UPLOAD_DIR = "uploads";
const TEMP_DIR = "uploads/temp";

[UPLOAD_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Image size configs ───────────────────────────────────────────────────────

const IMAGE_SIZES = {
  // News featured image — 1200 × 1500 px (portrait)
  news: { width: 1200, height: 1500 },

  // Premium member profile photo — 600 × 600 px (square)
  memberPhoto: { width: 600, height: 600 },

  // Payment screenshot — keep original (just compress)
  screenshot: { width: null, height: null },

  // Premium news featured image — 1200 × 1500 px
  premiumNews: { width: 1200, height: 1500 },
};

// ─── Multer — saves to temp first ────────────────────────────────────────────

const tempStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage: tempStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB input limit
});

// ─── Sharp resize helper ──────────────────────────────────────────────────────

/**
 * Process an uploaded file with sharp.
 * - If width & height given: resize to exact size (cover crop, center)
 * - Always outputs JPEG at quality 85
 * - Moves from temp → uploads/, deletes temp file
 *
 * @param {Express.Multer.File} file  — multer file object
 * @param {"news"|"memberPhoto"|"screenshot"|"premiumNews"} type
 * @returns {Promise<string>} — final filename (e.g. "1234567890.jpg")
 */
export async function processImage(file, type = "news") {
  const { width, height } = IMAGE_SIZES[type] || IMAGE_SIZES.news;
  const outName = path.basename(file.filename, path.extname(file.filename)) + ".jpg";
  const outPath = path.join(UPLOAD_DIR, outName);

  let pipeline = sharp(file.path).rotate(); // auto-rotate by EXIF

  if (width && height) {
    pipeline = pipeline.resize(width, height, {
      fit: "cover",
      position: "centre",
    });
  } else {
    // Screenshot: no resize, just compress
    pipeline = pipeline.resize({ withoutEnlargement: true });
  }

  await pipeline
    .jpeg({ quality: 85 })
    .toFile(outPath);

  // Delete temp file
  fs.rm(file.path, { force: true }, () => {});

  return outName;
}

// ─── Middleware factories ─────────────────────────────────────────────────────

/**
 * Express middleware: process req.file after multer upload.
 * Attaches req.file.processedFilename and sets req.file.filename.
 */
export function resizeSingle(type) {
  return async (req, _res, next) => {
    if (!req.file) return next();
    try {
      const finalName = await processImage(req.file, type);
      req.file.filename = finalName;
      req.file.path = path.join(UPLOAD_DIR, finalName);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Express middleware: process specific fields from req.files after multer.fields().
 * fieldTypeMap: { fieldName: imageType }
 * e.g. { photo: "memberPhoto", paymentScreenshot: "screenshot" }
 */
export function resizeFields(fieldTypeMap) {
  return async (req, _res, next) => {
    if (!req.files) return next();
    try {
      for (const [field, type] of Object.entries(fieldTypeMap)) {
        const files = req.files[field];
        if (!files?.length) continue;
        for (let i = 0; i < files.length; i++) {
          try {
            const finalName = await processImage(files[i], type);
            files[i].filename = finalName;
            files[i].path = path.join(UPLOAD_DIR, finalName);
          } catch (imgErr) {
            // Image resize failed — keep original temp file as fallback
            console.error(`Image resize failed for ${field}[${i}]:`, imgErr.message);
            const fallbackName = files[i].filename;
            const fallbackDest = path.join(UPLOAD_DIR, fallbackName);
            try { fs.renameSync(files[i].path, fallbackDest); } catch {}
            files[i].path = fallbackDest;
          }
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Build URL path from multer file object */
export const filePath = (file) => (file ? `/uploads/${file.filename}` : "");

/** Delete old file from disk safely */
export const removeFile = (urlPath) => {
  if (!urlPath || !urlPath.startsWith("/uploads/")) return;
  fs.rm(urlPath.slice(1), { force: true }, () => {});
};

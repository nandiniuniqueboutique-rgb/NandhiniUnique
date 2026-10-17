// Photo uploads -> Cloudinary (permanent storage).
//
// Render's free disk is wiped on every deploy/restart, so photos are no longer saved to
// backend/uploads. Files are received in memory by multer, pushed to Cloudinary, and
// req.files[i].path is set to the permanent https URL. Routes keep using
// `upload.array("images", 6)` exactly as before.
//
// Settings (Render -> Environment): either CLOUDINARY_URL, or all three of
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
// Optional: CLOUDINARY_FOLDER (default "nandini-unique/products").

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

const FOLDER = process.env.CLOUDINARY_FOLDER || "nandini-unique/products";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB per photo

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (CLOUDINARY_URL) {
    cloudinary.config({ secure: true }); // the SDK reads CLOUDINARY_URL by itself
    configured = true;
  } else if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return configured;
}

const base = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files can be uploaded"));
  },
});

// Turn multer errors (file too large, wrong type, too many files) into clean 400 replies.
function wrap(multerMiddleware) {
  return (req, res, next) =>
    multerMiddleware(req, res, (err) => {
      if (!err) return next();
      const message = err.code === "LIMIT_FILE_SIZE" ? "Each photo must be 8 MB or smaller" : err.message;
      res.status(400).json({ message });
    });
}

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        resource_type: "image",
        // keep stored originals a sensible size; Cloudinary resizes further on delivery
        transformation: [{ width: 2000, height: 2000, crop: "limit" }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function pushToCloudinary(req, res, next) {
  try {
    const files = req.files && req.files.length ? req.files : req.file ? [req.file] : [];
    if (!files.length) return next();

    if (!ensureConfigured()) {
      return res.status(500).json({
        message: "Photo storage is not set up on the server yet (Cloudinary settings are missing).",
      });
    }

    const results = await Promise.all(files.map((f) => uploadBuffer(f.buffer)));
    files.forEach((f, i) => {
      f.path = results[i].secure_url; // permanent URL saved on the product
      f.cloudinaryPublicId = results[i].public_id;
      delete f.buffer;
    });
    next();
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    res.status(502).json({ message: "Photo upload failed. Please try again.", error: err.message });
  }
}

module.exports = {
  array: (field, max) => [wrap(base.array(field, max)), pushToCloudinary],
  single: (field) => [wrap(base.single(field)), pushToCloudinary],
  none: () => wrap(base.none()),
};

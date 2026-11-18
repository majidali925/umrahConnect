const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ALLOWED_UPLOAD_MIME_TYPES } = require('../constants');

const EXTENSIONS = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    // req.agency is attached by the controller-level loader before multer runs.
    const dir = path.join(env.uploads.dir, 'agency-documents', req.agency._id.toString());
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(_req, file, cb) {
    // Random name: never trust or reuse the client-provided file name on disk.
    cb(null, `${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`);
  },
});

const documentUpload = multer({
  storage,
  limits: { fileSize: env.uploads.maxFileSizeMb * 1024 * 1024, files: 1, fields: 5 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only PDF, JPG and PNG files are allowed', { code: 'INVALID_FILE_TYPE' }));
    }
    cb(null, true);
  },
});

// File signatures ("magic bytes") — the declared MIME type is client-controlled and can lie.
const SIGNATURES = {
  'application/pdf': [Buffer.from('%PDF')],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
};

async function verifyFileSignature(req, _res, next) {
  if (!req.file) return next();
  const handle = await fs.promises.open(req.file.path, 'r');
  try {
    const header = Buffer.alloc(8);
    await handle.read(header, 0, 8, 0);
    const valid = (SIGNATURES[req.file.mimetype] || []).some((sig) =>
      header.subarray(0, sig.length).equals(sig),
    );
    // The stored file is removed by cleanupUploadOnError.
    if (!valid) throw ApiError.badRequest('File content does not match its type', { code: 'INVALID_FILE_TYPE' });
  } finally {
    await handle.close();
  }
  next();
}

/**
 * Error handler placed at the end of upload routes: removes the stored file whenever the
 * request failed after Multer saved it (bad signature, validation, service errors...).
 */
async function cleanupUploadOnError(err, req, _res, next) {
  if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
  next(err);
}

module.exports = { documentUpload, verifyFileSignature, cleanupUploadOnError };

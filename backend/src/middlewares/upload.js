const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ALLOWED_UPLOAD_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES } = require('../constants');

/**
 * Files are held in memory (size-limited) and only sent to storage by the service once
 * every check has passed, so a rejected request never leaves a stored file behind.
 */
function memoryUpload({ maxSizeMb, mimeTypes, typeError }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1, fields: 5 },
    fileFilter(_req, file, cb) {
      if (!mimeTypes.includes(file.mimetype)) return cb(ApiError.badRequest(typeError, { code: 'INVALID_FILE_TYPE' }));
      cb(null, true);
    },
  });
}

const documentUpload = memoryUpload({
  maxSizeMb: env.uploads.maxFileSizeMb,
  mimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
  typeError: 'Only PDF, JPG and PNG files are allowed',
});

const imageUpload = memoryUpload({
  maxSizeMb: env.uploads.maxImageSizeMb,
  mimeTypes: ALLOWED_IMAGE_MIME_TYPES,
  typeError: 'Only JPG, PNG and WebP photos are allowed',
});

// File signatures ("magic bytes") — the declared MIME type is client-controlled and can lie.
// Each entry is a list of [offset, bytes] parts that must all match.
const SIGNATURES = {
  'application/pdf': [[0, Buffer.from('%PDF')]],
  'image/jpeg': [[0, Buffer.from([0xff, 0xd8, 0xff])]],
  'image/png': [[0, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]],
  'image/webp': [
    [0, Buffer.from('RIFF')],
    [8, Buffer.from('WEBP')],
  ],
};

function verifyFileSignature(req, _res, next) {
  if (!req.file) return next();
  const parts = SIGNATURES[req.file.mimetype] || [];
  const { buffer } = req.file;
  const valid =
    parts.length > 0 && parts.every(([offset, sig]) => buffer.subarray(offset, offset + sig.length).equals(sig));
  if (!valid) throw ApiError.badRequest('File content does not match its type', { code: 'INVALID_FILE_TYPE' });
  next();
}

/** Rejects a request that reached an upload endpoint without a file. */
function requireFile(message) {
  return (req, _res, next) => {
    if (!req.file) throw ApiError.badRequest(message, { code: 'FILE_REQUIRED' });
    next();
  };
}

module.exports = { documentUpload, imageUpload, verifyFileSignature, requireFile };

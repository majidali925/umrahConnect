/**
 * The single place where this project stores files. Every upload must go through
 * saveFile(), which forces it under the configured Cloudinary root folder
 * (CLOUDINARY_FOLDER, default "umrahconnect"), e.g. umrahconnect/agency-documents/<agencyId>/.
 *
 * Files are private: Cloudinary assets are uploaded as type "authenticated", so they cannot
 * be opened through a plain URL. They are fetched server-side with a short-lived signed
 * download URL and streamed to the client through authorized endpoints only.
 *
 * Without Cloudinary credentials (tests, offline development) files go to the local
 * uploads directory instead. Production refuses to start without Cloudinary (see config/env).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const PROVIDERS = Object.freeze({ CLOUDINARY: 'cloudinary', LOCAL: 'local' });
const EXTENSIONS = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };
const DOWNLOAD_URL_TTL_SECONDS = 60;

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
} else if (!env.isTest) {
  console.warn('[storage] Cloudinary is not configured: uploads are stored on local disk');
}

/** Rejects folder names that could escape the root folder or the uploads directory. */
function cleanFolder(folder) {
  const parts = folder.split('/').filter(Boolean);
  if (!parts.length || parts.some((p) => p === '.' || p === '..' || !/^[\w-]+$/.test(p))) {
    throw new Error(`Invalid storage folder: ${folder}`);
  }
  return parts.join('/');
}

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result))).end(buffer);
  });
}

/**
 * Stores a file and returns a reference to save with the record:
 * { provider, key, resourceType }. `folder` is relative to the project root folder.
 */
async function saveFile(buffer, { folder, mimeType }) {
  const relativeFolder = cleanFolder(folder);
  // Random name: never trust or reuse the client-provided file name.
  const fileName = `${crypto.randomUUID()}${EXTENSIONS[mimeType] || ''}`;

  if (env.cloudinary.enabled) {
    const assetFolder = `${env.cloudinary.rootFolder}/${relativeFolder}`;
    // "raw" keeps the file byte-for-byte (no PDF/image parsing or transformations).
    const result = await uploadToCloudinary(buffer, {
      resource_type: 'raw',
      type: 'authenticated',
      asset_folder: assetFolder, // folder shown in the Media Library (dynamic folder mode)
      public_id: `${assetFolder}/${fileName}`, // same path in the public ID (fixed folder mode)
      overwrite: false,
    });
    return { provider: PROVIDERS.CLOUDINARY, key: result.public_id, resourceType: result.resource_type };
  }

  const dir = path.join(env.uploads.dir, relativeFolder);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, fileName), buffer, { flag: 'wx' });
  return { provider: PROVIDERS.LOCAL, key: path.posix.join(relativeFolder, fileName) };
}

function resolveLocalPath(key) {
  const root = path.resolve(env.uploads.dir);
  const filePath = path.resolve(root, key);
  // Defense in depth: never touch anything outside the uploads directory.
  if (!filePath.startsWith(root + path.sep)) throw ApiError.notFound('Document not found');
  return filePath;
}

function cloudinaryOptions(file) {
  return { resource_type: file.resourceType || 'raw', type: 'authenticated' };
}

/** Opens a stored file for streaming. `file` is { provider, key, resourceType }. */
async function openFile(file) {
  if (file.provider === PROVIDERS.CLOUDINARY) {
    const url = cloudinary.utils.private_download_url(file.key, '', {
      ...cloudinaryOptions(file),
      expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_URL_TTL_SECONDS,
    });
    const res = await fetch(url);
    if (res.status === 404) throw ApiError.notFound('Document file is missing');
    if (!res.ok || !res.body) {
      console.error(`[storage] Cloudinary download failed for ${file.key}: HTTP ${res.status}`);
      throw new ApiError(502, 'Could not load the document, please try again');
    }
    return Readable.fromWeb(res.body);
  }

  const filePath = resolveLocalPath(file.key);
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    throw ApiError.notFound('Document file is missing');
  }
  return fs.createReadStream(filePath);
}

/** Deletes a stored file. Failures are logged, never thrown: the record is already gone. */
async function deleteFile(file) {
  try {
    if (file.provider === PROVIDERS.CLOUDINARY) {
      await cloudinary.uploader.destroy(file.key, { ...cloudinaryOptions(file), invalidate: true });
    } else {
      await fs.promises.unlink(resolveLocalPath(file.key));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[storage] Could not delete ${file.key}: ${err.message || err.error?.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Public images (agency header photos, package cover photos)          */
/* ------------------------------------------------------------------ */

// Originals larger than this are scaled down on upload: plenty for a full-width banner.
const MAX_IMAGE_DIMENSION = 2400;

/**
 * Stores a public image under the project root folder and returns { url, publicId }.
 * Unlike documents these are meant to be seen by everyone, so they are ordinary Cloudinary
 * images that the frontend loads (resized on the fly) straight from Cloudinary's CDN.
 */
async function saveImage(buffer, { folder }) {
  if (!env.cloudinary.enabled) {
    throw new ApiError(503, 'Image uploads are not available: file storage is not configured', {
      code: 'STORAGE_UNAVAILABLE',
    });
  }
  const assetFolder = `${env.cloudinary.rootFolder}/${cleanFolder(folder)}`;
  let result;
  try {
    result = await uploadToCloudinary(buffer, {
      resource_type: 'image',
      asset_folder: assetFolder,
      public_id: `${assetFolder}/${crypto.randomUUID()}`,
      overwrite: false,
      transformation: [{ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, crop: 'limit' }],
    });
  } catch (err) {
    // Cloudinary rejects files it cannot decode (corrupt or disguised images) with a 400.
    if (err.http_code === 400) throw ApiError.badRequest('This image could not be read. Please choose another photo.', { code: 'INVALID_IMAGE' });
    throw err;
  }
  return { url: result.secure_url, publicId: result.public_id };
}

/** Deletes a public image. Failures are logged, never thrown. */
async function deleteImage(publicId) {
  if (!publicId || !env.cloudinary.enabled) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (err) {
    console.error(`[storage] Could not delete image ${publicId}: ${err.message || err.error?.message}`);
  }
}

module.exports = { PROVIDERS, saveFile, openFile, deleteFile, saveImage, deleteImage };

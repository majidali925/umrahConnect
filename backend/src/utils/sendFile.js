const fs = require('fs');
const ApiError = require('./ApiError');

/** Streams a private document with headers that prevent caching and content sniffing. */
async function sendPrivateFile(res, { document, filePath }) {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    throw ApiError.notFound('Document file is missing');
  }

  const safeName = document.originalFileName.replace(/[^\w.\- ]+/g, '_');
  res.set({
    'Content-Type': document.mimeType,
    'Content-Disposition': `inline; filename="${safeName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
}

module.exports = { sendPrivateFile };

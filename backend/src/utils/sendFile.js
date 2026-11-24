const { pipeline } = require('stream/promises');

/** Streams a private document with headers that prevent caching and content sniffing. */
async function sendPrivateFile(res, { document, stream }) {
  const safeName = document.originalFileName.replace(/[^\w.\- ]+/g, '_');
  res.set({
    'Content-Type': document.mimeType,
    'Content-Disposition': `inline; filename="${safeName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  await pipeline(stream, res);
}

module.exports = { sendPrivateFile };

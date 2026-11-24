const mongoose = require('mongoose');

/** A public photo stored in Cloudinary (see services/storage.service saveImage). */
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

/** Public JSON for an image: the URL only, never the storage id. */
const imageToJSON = (image) => (image?.url ? { url: image.url } : null);

module.exports = { imageSchema, imageToJSON };

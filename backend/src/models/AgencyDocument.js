const mongoose = require('mongoose');
const { DOCUMENT_TYPES, DOCUMENT_STATUS, DOCUMENT_CATEGORIES } = require('../constants');

const agencyDocumentSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true },
    documentType: { type: String, enum: Object.keys(DOCUMENT_TYPES), required: true },
    category: { type: String, enum: Object.values(DOCUMENT_CATEGORIES), required: true },
    // Storage key (see services/storage.service): the Cloudinary public ID, or for documents
    // stored on local disk, the path relative to the uploads directory. Never returned to
    // clients; files are streamed through authorized endpoints only.
    documentUrl: { type: String, required: true },
    // Documents created before the move to Cloudinary have no provider and are on local disk.
    storageProvider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    storageResourceType: { type: String },
    originalFileName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    verificationStatus: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.documentUrl;
        delete ret.storageProvider;
        delete ret.storageResourceType;
        delete ret.__v;
        return ret;
      },
    },
  },
);

agencyDocumentSchema.index({ agencyId: 1, documentType: 1 });

module.exports = mongoose.model('AgencyDocument', agencyDocumentSchema);

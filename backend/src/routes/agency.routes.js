const express = require('express');
const controller = require('../controllers/agency.controller');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { loadMyAgency, requireEditableAgency, requireApprovedAgency } = require('../middlewares/agency');
const { documentUpload, imageUpload, verifyFileSignature, requireFile } = require('../middlewares/upload');
const vendorController = require('../controllers/vendor.controller');
const packageController = require('../controllers/package.controller');
const featuredController = require('../controllers/featured.controller');
const schemas = require('../validators/agency.validator');
const packageSchemas = require('../validators/package.validator');
const featuredSchemas = require('../validators/featured.validator');
const { hotelSearchLimiter } = require('../middlewares/rateLimiter');
const { ROLES } = require('../constants');

const router = express.Router();

// Every agency route requires an authenticated AGENCY user; each service call is
// additionally scoped to the agency owned by req.user (resource-level authorization).
router.use(authenticate, authorize(ROLES.AGENCY));

router.get('/me', controller.getMyAgency);
router.put('/me', validate(schemas.updateAgency), controller.updateMyAgency);
router.post('/onboarding', controller.submitApplication);
router.get('/verification-status', controller.getVerificationStatus);

router.post(
  '/documents',
  loadMyAgency,
  requireEditableAgency, // checked before multer so the file body is never read otherwise
  documentUpload.single('file'),
  verifyFileSignature,
  validate(schemas.uploadDocument),
  controller.uploadDocument,
);
router.get('/documents/:documentId/file', validate(schemas.documentIdParam, 'params'), controller.viewDocument);
router.delete('/documents/:documentId', validate(schemas.documentIdParam, 'params'), controller.deleteDocument);

router.get('/publishing-access', loadMyAgency, requireApprovedAgency, controller.getPublishingAccess);

// Public photos (multipart field "image", JPG/PNG/WebP up to 5 MB), approved agencies only.
const photoUpload = [imageUpload.single('image'), verifyFileSignature, requireFile('Please choose a photo to upload')];
router.put('/me/header-image', loadMyAgency, requireApprovedAgency, photoUpload, vendorController.setHeaderImage);
router.delete('/me/header-image', loadMyAgency, requireApprovedAgency, vendorController.removeHeaderImage);

// Packages and seat requests: approved agencies only, always scoped to req.agency.
const approved = [loadMyAgency, requireApprovedAgency];
const byPackage = validate(packageSchemas.packageIdParam, 'params');
const byQuotation = validate(packageSchemas.quotationIdParam, 'params');

router.get('/packages', approved, validate(packageSchemas.listMyPackages, 'query'), packageController.listMine);
router.post('/packages', approved, validate(packageSchemas.packageBody), packageController.create);
router.get(
  '/hotels/search',
  approved,
  hotelSearchLimiter,
  validate(packageSchemas.searchHotels, 'query'),
  packageController.searchHotels,
);
router.get('/packages/:packageId', approved, byPackage, packageController.getMine);
router.put('/packages/:packageId', approved, byPackage, validate(packageSchemas.packageBody), packageController.update);
router.patch(
  '/packages/:packageId/status',
  approved,
  byPackage,
  validate(packageSchemas.setPackageStatus),
  packageController.setStatus,
);
router.delete('/packages/:packageId', approved, byPackage, packageController.remove);
router.put('/packages/:packageId/cover-image', approved, byPackage, photoUpload, vendorController.setCoverImage);
router.delete('/packages/:packageId/cover-image', approved, byPackage, vendorController.removeCoverImage);

// Featuring: apply to have a published package pinned to the top of search results for 7 days.
// The application is filled in from the agency and package; proof of payment is optional
// (multipart field "paymentProof": PDF/JPG/PNG) and gets the request reviewed first.
router.get('/packages/:packageId/feature', approved, byPackage, featuredController.preview);
router.post(
  '/packages/:packageId/feature',
  approved,
  byPackage,
  documentUpload.single('paymentProof'),
  verifyFileSignature,
  validate(featuredSchemas.requestFeature),
  featuredController.request,
);
router.delete('/packages/:packageId/feature', approved, byPackage, featuredController.withdraw);

router.get('/quotations', approved, validate(packageSchemas.listQuotations, 'query'), packageController.listAgencyQuotations);
router.patch(
  '/quotations/:quotationId/confirm',
  approved,
  byQuotation,
  validate(packageSchemas.confirmQuotation),
  packageController.confirmQuotation,
);
router.patch(
  '/quotations/:quotationId/decline',
  approved,
  byQuotation,
  validate(packageSchemas.declineQuotation),
  packageController.declineQuotation,
);
router.patch(
  '/quotations/:quotationId/cancel',
  approved,
  byQuotation,
  validate(packageSchemas.cancelQuotation),
  packageController.cancelBooking,
);

module.exports = router;

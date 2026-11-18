const express = require('express');
const controller = require('../controllers/package.controller');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { quotationLimiter } = require('../middlewares/rateLimiter');
const schemas = require('../validators/package.validator');
const { ROLES } = require('../constants');

const router = express.Router();

const byPackage = validate(schemas.packageIdParam, 'params');

// Public catalogue: only published, upcoming packages from approved agencies.
router.get('/', validate(schemas.browsePackages, 'query'), controller.browse);
router.get('/departure-cities', controller.departureCities);
router.get('/:packageId', byPackage, controller.getPublic);

// Customers request seats; the agency confirms. No payment is taken.
router.post(
  '/:packageId/quotations',
  authenticate,
  authorize(ROLES.CUSTOMER),
  quotationLimiter,
  byPackage,
  validate(schemas.requestQuotation),
  controller.requestQuotation,
);

module.exports = router;

const express = require('express');
const controller = require('../controllers/package.controller');
const vendorController = require('../controllers/vendor.controller');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const schemas = require('../validators/package.validator');
const vendorSchemas = require('../validators/vendor.validator');
const { ROLES } = require('../constants');

const router = express.Router();

// A customer's own seat requests. Every query is scoped to req.user.
router.use(authenticate, authorize(ROLES.CUSTOMER));

router.get('/', validate(schemas.listQuotations, 'query'), controller.listMyQuotations);
router.patch('/:quotationId/cancel', validate(schemas.quotationIdParam, 'params'), controller.cancelMyQuotation);
// Rate the agency after a completed trip (creates or updates the customer's review).
router.put(
  '/:quotationId/review',
  validate(schemas.quotationIdParam, 'params'),
  validate(vendorSchemas.submitReview),
  vendorController.submitReview,
);

module.exports = router;

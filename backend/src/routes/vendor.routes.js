const express = require('express');
const controller = require('../controllers/vendor.controller');
const validate = require('../middlewares/validate');
const schemas = require('../validators/vendor.validator');

const router = express.Router();

// Public agency pages: approved agencies only. Their packages come from GET /packages?agencyId=.
const byAgency = validate(schemas.agencyIdParam, 'params');
router.get('/:agencyId', byAgency, controller.getPublicProfile);
router.get('/:agencyId/reviews', byAgency, validate(schemas.listReviews, 'query'), controller.listReviews);

module.exports = router;

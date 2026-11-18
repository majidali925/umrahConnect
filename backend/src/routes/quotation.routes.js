const express = require('express');
const controller = require('../controllers/package.controller');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const schemas = require('../validators/package.validator');
const { ROLES } = require('../constants');

const router = express.Router();

// A customer's own seat requests. Every query is scoped to req.user.
router.use(authenticate, authorize(ROLES.CUSTOMER));

router.get('/', validate(schemas.listQuotations, 'query'), controller.listMyQuotations);
router.patch('/:quotationId/cancel', validate(schemas.quotationIdParam, 'params'), controller.cancelMyQuotation);

module.exports = router;

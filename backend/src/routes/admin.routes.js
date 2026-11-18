const express = require('express');
const controller = require('../controllers/admin.controller');
const validate = require('../middlewares/validate');
const { authenticateAdmin } = require('../middlewares/adminAuth');
const schemas = require('../validators/admin.validator');

const router = express.Router();

// Admin sign-in/session endpoints are public; everything after requires an admin token.
router.use('/auth', require('./adminAuth.routes'));
router.use(authenticateAdmin);

const byId = validate(schemas.idParam, 'params');
const byDocument = validate(schemas.documentParams, 'params');

router.get('/dashboard', controller.dashboard);

router.get('/agencies', validate(schemas.listAgencies, 'query'), controller.listAgencies);
router.get('/agencies/:id', byId, controller.getAgency);
router.patch('/agencies/:id/review', byId, controller.startReview);
router.patch('/agencies/:id/approve', byId, validate(schemas.approve), controller.approve);
router.patch('/agencies/:id/reject', byId, validate(schemas.reject), controller.reject);
router.patch('/agencies/:id/suspend', byId, validate(schemas.suspend), controller.suspend);
router.patch('/agencies/:id/reinstate', byId, controller.reinstate);
router.get('/agencies/:id/documents/:documentId/file', byDocument, controller.viewDocument);
router.patch(
  '/agencies/:id/documents/:documentId/review',
  byDocument,
  validate(schemas.reviewDocument),
  controller.reviewDocument,
);

router.get('/users', validate(schemas.listUsers, 'query'), controller.listUsers);
router.get('/audit-logs', validate(schemas.listAuditLogs, 'query'), controller.listAuditLogs);

module.exports = router;

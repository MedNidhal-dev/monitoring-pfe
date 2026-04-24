const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const logsController = require('../controllers/logsController');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

router.post('/ingest', [
  body('logs').isArray({ min: 1 }).withMessage('Logs must be a non-empty array'),
  body('logs.*.server_name').optional().trim().isLength({ max: 100 }).escape(),
  body('logs.*.message').optional().trim().isLength({ max: 1000 }).escape(),
  body('logs.*.severity').optional().trim().isIn(['low', 'medium', 'high', 'critical']),
  handleValidationErrors
], logsController.ingestLogs);

router.get('/', [
  query('server').optional().trim().isLength({ max: 100 }).escape(),
  query('severity').optional().trim().isIn(['low', 'medium', 'high', 'critical']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  handleValidationErrors
], logsController.getLogs);

router.get('/server/:serverName', [
  param('serverName').trim().isLength({ min: 1, max: 100 }).escape(),
  handleValidationErrors
], logsController.getLogsByServer);

router.get('/export', logsController.exportLogs); 

module.exports = router;
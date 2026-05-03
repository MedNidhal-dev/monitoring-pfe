const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// Case-insensitive role check helper
const checkRoleCI = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied - insufficient privileges' });
    }
    next();
  };
};

router.get('/', knowledgeController.getAllKnowledge);

router.get('/resolve/:anomalyType',
  param('anomalyType').trim().isLength({ min: 1, max: 100 }).escape(),
  handleValidationErrors,
  knowledgeController.getSolutions
);

router.post('/', checkRoleCI(['devops']), [
  body('head').trim().isLength({ min: 1, max: 200 }).withMessage('Head (anomaly) required (max 200 chars)').escape(),
  body('relation').trim().isLength({ min: 1, max: 100 }).withMessage('Relation required (max 100 chars)').escape(),
  body('tail').trim().isLength({ min: 1, max: 500 }).withMessage('Tail (cause/solution) required (max 500 chars)').escape(),
  handleValidationErrors
], knowledgeController.addKnowledge);

router.put('/:id', checkRoleCI(['devops']), [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID'),
  body('head').optional().trim().isLength({ min: 1, max: 200 }).escape(),
  body('relation').optional().trim().isLength({ min: 1, max: 100 }).escape(),
  body('tail').optional().trim().isLength({ min: 1, max: 500 }).escape(),
  handleValidationErrors
], knowledgeController.updateKnowledge);

router.delete('/:id', checkRoleCI(['devops']), [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID'),
  handleValidationErrors
], knowledgeController.deleteKnowledge);

module.exports = router;

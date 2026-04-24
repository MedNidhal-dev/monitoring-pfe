const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const checkRole = require('../Middleware/rbacMiddleware');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

router.get('/', knowledgeController.getAllKnowledge);

router.get('/resolve/:anomalyType',
  param('anomalyType').trim().isLength({ min: 1, max: 100 }).escape(),
  handleValidationErrors,
  knowledgeController.getSolutions
);

router.post('/', checkRole(['devops']), [
  body('subject').trim().isLength({ min: 1, max: 200 }).withMessage('Subject required (max 200 chars)').escape(),
  body('predicate').trim().isLength({ min: 1, max: 100 }).withMessage('Predicate required (max 100 chars)').escape(),
  body('object').trim().isLength({ min: 1, max: 500 }).withMessage('Object required (max 500 chars)').escape(),
  handleValidationErrors
], knowledgeController.addKnowledge);

router.put('/:id', checkRole(['devops']), [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID'),
  body('subject').optional().trim().isLength({ min: 1, max: 200 }).escape(),
  body('predicate').optional().trim().isLength({ min: 1, max: 100 }).escape(),
  body('object').optional().trim().isLength({ min: 1, max: 500 }).escape(),
  handleValidationErrors
], knowledgeController.updateKnowledge);

router.delete('/:id', checkRole(['devops']), [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID'),
  handleValidationErrors
], knowledgeController.deleteKnowledge);

module.exports = router;

const express = require('express');
const router = express.Router();
const incidentsController = require('../controllers/incidentsController');
const checkRole = require('../Middleware/rbacMiddleware');

router.get('/', incidentsController.getAllIncidents);
router.get('/stats', incidentsController.getStats);
router.get('/:id', incidentsController.getIncidentById);
router.patch('/:id/resolve', checkRole(['devops']), incidentsController.resolveIncident);

module.exports = router;

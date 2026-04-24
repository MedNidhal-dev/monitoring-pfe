const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

router.post('/ingest', metricsController.ingestMetrics);
router.get('/', metricsController.getLatestMetrics);
router.get('/module/:moduleType', metricsController.getMetricsByModule);
router.get('/jenkins', metricsController.getJenkinsMetrics);
router.get('/nexus', metricsController.getNexusMetrics);

module.exports = router;
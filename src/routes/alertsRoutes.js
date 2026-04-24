const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');

router.post('/', alertsController.receiveAlert);

module.exports = router;

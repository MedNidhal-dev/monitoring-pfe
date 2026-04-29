const alertService = require('../services/alertService');

exports.receiveAlert = async (req, res) => {
  try {
    console.log('[AAA9EEF] Received new alert from AI');

    const incident = await alertService.processAlert(req.body);

    if (incident) {
      res.json({
        success: true,
        message: 'Alert processed successfully',
        incident_id: incident.id
      });
    } else {
      res.json({ success: false, message: 'Invalid alert data' });
    }

  } catch (err) {
    console.error('Alert processing error:', err.message);
    res.json({ success: false, error: 'Error processing alert' });
  }
};

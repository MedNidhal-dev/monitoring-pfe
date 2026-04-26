const Incident = require('../models/Incident');
const reportService = require('../services/reportService');
const { client } = require('../config/redis');

exports.getAllIncidents = async (req, res) => {
  try {
    let limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const list = await Incident.getAll(limit);
    
    console.log('Fetching incidents, count:', list.length);
    
    res.json({ 
      success: true, 
      count: list.length, 
      incidents: list 
    });
  } catch (err) {
    console.error('DB error getting incidents:', err.message);
    res.status(500).json({ success: false, message: 'Database error' });
  }
};

exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.getById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    res.json({ success: true, incident });
  } catch (err) {
    console.error('getIncidentById error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resolveIncident = async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Resolving incident:', id);
    
    const result = await Incident.resolve(id);
    
    if (!result) {
      return res.json({ success: false, message: 'Update failed' });
    }
    
    res.json({ 
      success: true, 
      message: 'Incident marked as resolved' 
    });
    
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    // 1. Check Redis cache first
    const cached = await client.get('dashboard_stats');
    if (cached) {
      console.log('[Redis] Returning cached stats');
      return res.json({ success: true, stats: JSON.parse(cached), cached: true });
    }

    // 2. If not cached, calculate from database
    console.log('[DB] Calculating stats...');
    const stats = await reportService.calculerStatsDashboard();

    // 3. Save to Redis for 5 minutes (300 seconds)
    await client.setEx('dashboard_stats', 300, JSON.stringify(stats));
    console.log('[Redis] Stats cached for 5 minutes');

    res.json({ success: true, stats, cached: false });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ success: false });
  }
};

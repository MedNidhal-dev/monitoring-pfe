const Metric = require('../models/Metric');
const metricService = require('../Services/metricService');

exports.ingestMetrics = async (req, res) => {
  try {
    console.log('Received metric from Logstash');
    
    const data = metricService.extractMetricData(req.body);
    metricService.validateMetricData(data);
    await Metric.create(data);
    
    console.log(`Metric saved: ${data.module_type}/${data.metric_set}`);
    res.status(200).json({ success: true, message: 'Metric saved' });
  } catch (error) {
    console.error('Metric ingestion error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLatestMetrics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const metrics = await Metric.getAll(limit);
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMetricsByModule = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const metrics = await Metric.getByModule(req.params.moduleType, limit);
    res.json({ success: true, count: metrics.length, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getJenkinsMetrics = async (req, res) => {
  try {
    const metrics = await Metric.getByModule('prometheus', 50);
    res.json({ success: true, jenkins: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getNexusMetrics = async (req, res) => {
  try {
    const metrics = await Metric.getByModule('http', 50);
    res.json({ success: true, nexus: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

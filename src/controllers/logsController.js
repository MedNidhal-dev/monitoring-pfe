const Log = require('../models/Logs');
const logService = require('../services/logService');

exports.ingestLogs = async (req, res) => {
  try {
    console.log('Received log from Logstash');
    
    const data = logService.extractLogData(req.body);
    logService.validateLogData(data);
    await Log.create(data);
    
    console.log(`Log inserted: [${data.log_level}] ${data.server_name}`);
    
    res.status(200).json({
      success: true,
      message: 'Log saved'
    });
    
  } catch (error) {
    console.error('Ingestion error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await Log.getAll(limit);
    
    res.json({
      success: true,
      count: logs.length,
      logs: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getLogsByServer = async (req, res) => {
  try {
    const serverName = req.params.serverName;
    const limit = parseInt(req.query.limit) || 100;
    
    const logs = await Log.getByServer(serverName, limit);
    
    res.json({
      success: true,
      server: serverName,
      count: logs.length,
      logs: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.exportLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await Log.getAll(limit);
    
    let fileContent = `========================================\n`;
    fileContent += `SOLIFE LOGS REPORT\n`;
    fileContent += `Export Date: ${new Date().toISOString()}\n`;
    fileContent += `========================================\n\n`;
    
    logs.forEach(log => {
      const timestamp = new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19);
      fileContent += `[${timestamp}] [${log.log_level}] [${log.server_name}] ${log.message}\n`;
    });
    
    fileContent += `\n========================================\n`;
    fileContent += `Total: ${logs.length} logs\n`;
    
    const counts = logs.reduce((acc, log) => {
      acc[log.log_level] = (acc[log.log_level] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(counts).forEach(([level, count]) => {
      fileContent += `${level}: ${count}\n`;
    });
    
    fileContent += `========================================\n`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="logs_export.log"');
    res.send(fileContent);
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
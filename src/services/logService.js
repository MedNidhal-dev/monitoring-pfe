function cleanValue(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === 'unknown') return null;
  if (str.startsWith('%{') && str.endsWith('}')) return null;
  return str;
}

function extractLogData(event) {
  let serverName = 'unknown';
  const serverCandidates = [
    event.server_name,
    event.host_name,
    event.fields?.server_name,
    event.host?.name,
    event.host?.hostname
  ];
  for (const candidate of serverCandidates) {
    const clean = cleanValue(candidate);
    if (clean) {
      serverName = clean;
      break;
    }
  }

  let serverIp = 'unknown';
  if (cleanValue(event.server_ip)) {
    serverIp = cleanValue(event.server_ip);
  } else if (event.fields?.server_ip) {
    serverIp = cleanValue(event.fields.server_ip);
  } else if (event.host?.ip) {
    serverIp = Array.isArray(event.host.ip) ? event.host.ip[0] : event.host.ip;
  }

  let logLevel = 'INFO';
  if (event.log_level) {
    logLevel = normalizeLogLevel(event.log_level);
  }

  let message = event.log_message || event.message || 'No message';
  
  let timestamp = event.log_timestamp || event['@timestamp'] || new Date().toISOString();
  
  return {
    server_name: serverName,
    server_ip: serverIp,
    log_level: logLevel,
    message: message,
    timestamp: timestamp
  };
}


function normalizeLogLevel(level) {
  if (!level) return 'INFO';
  
  const upper = level.toUpperCase();
  const map = {
    'WARN': 'WARNING',
    'WARNING': 'WARNING',
    'INFO': 'INFO',
    'ERROR': 'ERROR',
    'DEBUG': 'DEBUG',
    'FATAL': 'FATAL',
    'TRACE': 'DEBUG',
    'ERR': 'ERROR'
  };
  
  return map[upper] || 'INFO';
}

function validateLogData(data) {
  if (!data.message || data.message.trim().length === 0) {
    throw new Error('Message is required');
  }
  
  if (data.message.length > 10000) {
    throw new Error('Message too long (max 10000 chars)');
  }
  
  const validLevels = ['INFO', 'WARNING', 'ERROR', 'DEBUG', 'FATAL'];
  if (!validLevels.includes(data.log_level)) {
    throw new Error('Invalid log level: ' + data.log_level);
  }
  
  if (!data.server_name || data.server_name === 'unknown') {
    console.warn('Warning: Unknown server name');
  }
  
  return true;
}


module.exports = {
  extractLogData,
  validateLogData,
  normalizeLogLevel
};
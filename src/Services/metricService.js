function extractMetricData(event) {
  let host = 'unknown-host';
  
  if (event.host?.name) host = event.host.name;
  else if (event.host?.hostname) host = event.host.hostname;
  else if (event.agent?.name) host = event.agent.name;

  return {
    host_name: host,
    agent_type: event.agent?.type || 'metricbeat',
    module_type: event.event?.module || 'system',
    metric_set: event.event?.dataset || 'unknown-set',
    data: event.data_json || event,
    timestamp: event['@timestamp'] || new Date().toISOString()
  };
}

function validateMetricData(data) {
  if (!data?.data) throw new Error("Metric data required");
  if (typeof data.data === 'object' && Object.keys(data.data).length === 0) {
    throw new Error("Metric data empty");
  }
  if (!data.host_name || data.host_name === 'unknown-host') {
    console.warn('Warning: Unknown host');
  }
  return true;
}

module.exports = {
  extractMetricData,
  validateMetricData
};
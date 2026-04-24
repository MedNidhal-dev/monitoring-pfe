const Incident = require('../models/Incident');
const { broadcastIncident } = require('../config/websocket');
const { sendAlertEmail } = require('./emailService');

async function processAlert(input) {
  let data;

  if (typeof input === 'string' && input.includes("RAPPORT D'INCIDENT")) {
    console.log('Parsing raw text report');
    data = parseTextReport(input);
  } else {
    data = extractDataFromJSON(input);
  }

  // database saving
  const incident = await Incident.create(data);
  console.log('Incident created:', incident.id);

  // sending real time alert
  if (incident) {
    broadcastIncident(incident);
  }

  // email alert

  const severity = incident.severity.toUpperCase();
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    console.log(`[DevOps Email] Sending ${incident.severity} alert`);
    sendAlertEmail(incident).catch(function(err) {
      console.log('Email error:', err.message);
    });
  }

  return incident;
}

function extractDataFromJSON(input) {
  let title = input.title;
  if (!title) {
    if (input.service_name) {
      title = `Alert on ${input.service_name}`;
    } else {
      title = 'Alert on unknown';
    }
  }

  let description = input.description;
  if (!description) {
    description = 'no description';
  }

  let severity = input.severity;
  if (!severity) {
    severity = 'MEDIUM';
  }

  let timestamp = input.timestamp;
  if (!timestamp) {
    timestamp = new Date();
  }

  let checklist = input.checklist;
  if (!checklist) {
    checklist = [];
  }

  return {
    title: title,
    description: description,
    service_name: input.service_name,
    anomaly_type: input.anomaly_type,
    root_cause: input.root_cause,
    explanation: input.explanation,
    solutions: input.solutions,
    confidence: input.confidence,
    severity: severity,
    timestamp: timestamp,
    checklist: checklist
  };
}

function parseTextReport(text) {
  const data = {};
  
  function getValue(key) {
    const regex = new RegExp(key + ':\\s*(.*)', 'i');
    const match = text.match(regex);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  // Extract severity
  const severityValue = getValue('SÉVÉRITÉ');
  if (severityValue) {
    data.severity = severityValue;
  } else {
    data.severity = 'MEDIUM';
  }

  // Extract timestamp
  const timestampValue = getValue('DATE');
  if (timestampValue) {
    data.timestamp = timestampValue;
  } else {
    data.timestamp = new Date();
  }

  // Extract title 
  const titleMatch = text.match(/TITRE\s*─+\s*([\s\S]*?)\s*─+/);
  if (titleMatch) {
    data.title = titleMatch[1].trim();
  } else {
    data.title = 'AI Incident';
  }

  // Extract description
  const descMatch = text.match(/DESCRIPTION\s*─+\s*([\s\S]*?)\s*─+/);
  if (descMatch) {
    data.description = descMatch[1].trim();
  } else {
    data.description = '';
  }

  // Extract root cause
  const causeMatch = text.match(/CAUSE RACINE\s*─+\s*([\s\S]*?)\s*─+/);
  if (causeMatch) {
    data.root_cause = causeMatch[1].trim();
  } else {
    data.root_cause = 'Unknown';
  }

  // Extract solutions checklist
  const checklist = [];
  const solutionMatch = text.match(/(?:ACTIONS REQUISES|Solutions|RECOMMANDATIONS)\s*(?::|─+)\s*([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  
  if (solutionMatch) {
    const tasks = solutionMatch[1].trim().split(/[,;\n]/);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const clean = task.replace(/^[\*\-\[\]\s0-9.]+/, '').trim();
      if (clean && clean.length > 5) {
        checklist.push({ task: clean, completed: false });
      }
    }
  }
  data.checklist = checklist;

  const words = data.title.split(' ');
  if (words.length > 0 && words[0]) {
    data.anomaly_type = words[0];
  } else {
    data.anomaly_type = 'ANOMALY';
  }

  // Extract service name 
  const serviceValue = getValue('Serveur affecté');
  if (serviceValue) {
    data.service_name = serviceValue;
  } else {
    data.service_name = 'System';
  }

  // Extract confidence level
  const confidenceValue = getValue('Niveau de confiance');
  if (confidenceValue) {
    data.confidence = parseFloat(confidenceValue);
  } else {
    data.confidence = 0.8;
  }

  return data;
}

module.exports = { processAlert, parseTextReport };

const { WebSocketServer, WebSocket } = require('ws');

let wss = null;
let clients = new Set();

function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('[WebSocket] New client connected');

    ws.send(JSON.stringify({
      type: 'INFO',
      message: 'Connected to SOLIFE alerts'
    }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log('[WebSocket] Client disconnected');
    });
  });

  console.log('WebSocket server ready');
}

function broadcastIncident(incident) {
  if (!wss || clients.size === 0) return;

  const alert = JSON.stringify({
    type: 'NEW_INCIDENT',
    data: incident
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(alert);
    }
  });

  console.log(`[WebSocket] Alert sent to ${clients.size} clients`);
}

module.exports = { initWebSocket, broadcastIncident };
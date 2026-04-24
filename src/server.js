const http = require('http');
const app = require('./app');
const { pool } = require('./config/database');
const { initWebSocket } = require('./config/websocket');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');

    const httpServer = http.createServer(app);
    initWebSocket(httpServer);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket ready on ws://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
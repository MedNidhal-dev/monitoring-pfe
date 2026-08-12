const http = require('http');
const app = require('./app');
const { pool } = require('./config/database');
const { initWebSocket } = require('./config/websocket');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connected');
    } catch (dbError) {
      console.error('Database connection failed, but starting server anyway:', dbError.message);
    }

    const httpServer = http.createServer(app);
    initWebSocket(httpServer);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket ready on ws://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Critical failure during server startup:', error);
  }
};

startServer();
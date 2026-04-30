const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectRedis } = require('./config/redis');

const app = express();

// Connect Redis on startup
connectRedis().catch(console.error);

const authMiddleware = require('./Middleware/authMiddleware');
const errorHandler = require('./Middleware/errorHandler');

// Security headers
app.use(helmet());

// Rate limiting disabled for demo
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 1000,
//   message: { success: false, error: 'Too many requests' }
// });
// app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 attempts per 15 minutes
  message: { success: false, error: 'Too many login attempts, please try again later' }
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://192.168.75.129', 'http://192.168.75.129:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

const logsRoutes = require('./routes/logsRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const incidentsRoutes = require('./routes/incidentsRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const authRoutes = require('./routes/authRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/alerts', alertsRoutes);

app.use('/api/logs', authMiddleware, logsRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/incidents', authMiddleware, incidentsRoutes);
app.use('/api/knowledge', authMiddleware, knowledgeRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);

app.get('/', (req, res) => {
  res.send('<h1>SOLIFE Monitoring Backend Running!</h1>');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SOLIFE Monitoring Backend',
    routes: ['/api/logs', '/api/metrics', '/api/incidents', '/api/alerts', '/api/auth']
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.path}` });
});

app.use(errorHandler);

module.exports = app;
const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean).map(url => url.replace(/\/+$/, '')); // strip trailing slash

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, health checks)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: ${origin}`);
      console.error(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Root welcome
app.get('/', (req, res) => {
  res.json({ 
    name: 'Pembukuan Semangka API', 
    status: 'running',
    version: '1.0.0'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

// =============================================================================
// index.js — Application entry point
// =============================================================================
// Starts the Express server with:
//   - Prometheus metrics middleware (every HTTP request is instrumented)
//   - /metrics endpoint (Prometheus scrape target)
//   - /health and /ready endpoints (for Docker/ALB health checks)
//   - REST API routes: /api/users, /api/products, /api/orders
//   - Chaos endpoints: /api/simulate/*
//   - Auto-migration on startup (creates tables if needed)
// =============================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Metrics (must be imported early so collectors are registered)
const { client } = require('./metrics');

// Middleware
const metricsMiddleware = require('./middleware/metricsMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Routes
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const simulateRouter = require('./routes/simulate');

// DB
const { getPool } = require('./db/connection');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 8081;

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(morgan('short'));
app.use(metricsMiddleware);

// ---------------------------------------------------------------------------
// Prometheus metrics endpoint
// ---------------------------------------------------------------------------
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// ---------------------------------------------------------------------------
// Health & readiness
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/ready', async (_req, res) => {
  try {
    const pool = getPool();
    await pool.execute('SELECT 1');
    res.json({ status: 'ready', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

// ---------------------------------------------------------------------------
// API overview (root)
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    name: 'AWS Monitoring Demo API',
    version: '1.0.0',
    endpoints: {
      health:   'GET  /health',
      ready:    'GET  /ready',
      metrics:  'GET  /metrics',
      users:    'CRUD /api/users',
      products: 'CRUD /api/products',
      orders:   'CRUD /api/orders',
      simulate: {
        error:  'GET  /api/simulate/error',
        slow:   'GET  /api/simulate/slow?delay=3000',
        cpu:    'GET  /api/simulate/cpu?iterations=1000000',
        memory: 'GET  /api/simulate/memory?size=50',
      },
    },
  });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/simulate', simulateRouter);

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function start() {
  // Auto-migrate: create tables if they don't exist
  try {
    const pool = getPool();
    console.log('🔄 Running auto-migration...');

    await pool.execute(`CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      uuid        VARCHAR(36)  NOT NULL UNIQUE,
      username    VARCHAR(100) NOT NULL UNIQUE,
      email       VARCHAR(255) NOT NULL UNIQUE,
      full_name   VARCHAR(255) DEFAULT NULL,
      role        ENUM('admin','user','viewer') DEFAULT 'user',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS products (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      uuid        VARCHAR(36)   NOT NULL UNIQUE,
      name        VARCHAR(255)  NOT NULL,
      description TEXT,
      price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      stock       INT           NOT NULL DEFAULT 0,
      category    VARCHAR(100)  DEFAULT 'general',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS orders (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      uuid        VARCHAR(36)  NOT NULL UNIQUE,
      user_uuid   VARCHAR(36)  NOT NULL,
      product_uuid VARCHAR(36) NOT NULL,
      quantity    INT          NOT NULL DEFAULT 1,
      total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status      ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_uuid   (user_uuid),
      INDEX idx_product_uuid (product_uuid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    console.log('✅ Tables ready.');
  } catch (err) {
    console.warn('⚠️  DB auto-migration failed (app will still start):', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀  AWS Monitoring Demo API                        ║
║  📡  http://0.0.0.0:${PORT}                            ║
║  📊  http://0.0.0.0:${PORT}/metrics                    ║
║  🏥  http://0.0.0.0:${PORT}/health                     ║
╚══════════════════════════════════════════════════════╝
    `);
  });
}

start();

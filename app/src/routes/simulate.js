// =============================================================================
// routes/simulate.js — Endpoints to simulate errors and heavy load
// =============================================================================
// These endpoints are intentional chaos-engineering helpers so that
// Person 3's alert rules can be triggered during demos.
// =============================================================================

const { Router } = require('express');
const { appEventsTotal } = require('../metrics');

const router = Router();

// ---- GET /api/simulate/error — Returns a random 5xx error ----
router.get('/error', (req, res) => {
  const errors = [
    { status: 500, message: 'Internal Server Error (simulated)' },
    { status: 502, message: 'Bad Gateway (simulated)' },
    { status: 503, message: 'Service Unavailable (simulated)' },
  ];
  const err = errors[Math.floor(Math.random() * errors.length)];
  appEventsTotal.inc({ event_type: 'simulated_error' });
  res.status(err.status).json({ success: false, error: err });
});

// ---- GET /api/simulate/slow?delay=<ms> — Simulates a slow response ----
router.get('/slow', async (req, res) => {
  const delay = Math.min(parseInt(req.query.delay || '3000', 10), 30000); // max 30s
  appEventsTotal.inc({ event_type: 'simulated_slow' });
  await new Promise((resolve) => setTimeout(resolve, delay));
  res.json({ success: true, message: `Responded after ${delay}ms delay` });
});

// ---- GET /api/simulate/cpu — CPU-intensive operation ----
router.get('/cpu', (req, res) => {
  const iterations = Math.min(parseInt(req.query.iterations || '1000000', 10), 50000000);
  appEventsTotal.inc({ event_type: 'simulated_cpu' });
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  res.json({ success: true, message: `CPU work done (${iterations} iterations)`, result });
});

// ---- GET /api/simulate/memory — Allocate memory temporarily ----
router.get('/memory', (req, res) => {
  const sizeMB = Math.min(parseInt(req.query.size || '50', 10), 200); // max 200 MB
  appEventsTotal.inc({ event_type: 'simulated_memory' });
  // Allocate buffer (will be GC'd after response)
  const buf = Buffer.alloc(sizeMB * 1024 * 1024, 'x');
  res.json({ success: true, message: `Allocated ${sizeMB}MB (${buf.length} bytes), will be GC'd` });
});

module.exports = router;

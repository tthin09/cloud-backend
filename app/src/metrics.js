// =============================================================================
// metrics.js — All custom Prometheus metrics for the demo application
// =============================================================================
// Naming follows Prometheus conventions:
//   https://prometheus.io/docs/practices/naming/
//
// Agreed metric names with Person 3 (Grafana/Alerting):
//   app_http_requests_total          — Counter
//   app_http_request_duration_seconds — Histogram
//   app_http_errors_total            — Counter
//   app_db_queries_total             — Counter
//   app_db_query_duration_seconds    — Histogram
//   app_active_connections           — Gauge
//   app_db_pool_active_connections   — Gauge
// =============================================================================

const client = require('prom-client');

const PREFIX = process.env.METRICS_PREFIX || 'app_';

// ---------------------------------------------------------------------------
// Default metrics (process CPU, memory, event loop lag, etc.)
// ---------------------------------------------------------------------------
client.collectDefaultMetrics({
  prefix: PREFIX,
  labels: { app: 'monitoring-demo' },
});

// ---------------------------------------------------------------------------
// HTTP — Counter: total requests
// ---------------------------------------------------------------------------
const httpRequestsTotal = new client.Counter({
  name: `${PREFIX}http_requests_total`,
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
});

// ---------------------------------------------------------------------------
// HTTP — Counter: total errors (4xx & 5xx)
// ---------------------------------------------------------------------------
const httpErrorsTotal = new client.Counter({
  name: `${PREFIX}http_errors_total`,
  help: 'Total number of HTTP error responses (4xx and 5xx)',
  labelNames: ['method', 'route', 'status_code'],
});

// ---------------------------------------------------------------------------
// HTTP — Histogram: request duration
// ---------------------------------------------------------------------------
const httpRequestDuration = new client.Histogram({
  name: `${PREFIX}http_request_duration_seconds`,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// ---------------------------------------------------------------------------
// DB — Counter: total queries
// ---------------------------------------------------------------------------
const dbQueriesTotal = new client.Counter({
  name: `${PREFIX}db_queries_total`,
  help: 'Total number of database queries executed',
  labelNames: ['operation', 'table', 'success'],
});

// ---------------------------------------------------------------------------
// DB — Histogram: query duration
// ---------------------------------------------------------------------------
const dbQueryDuration = new client.Histogram({
  name: `${PREFIX}db_query_duration_seconds`,
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

// ---------------------------------------------------------------------------
// App — Gauge: active HTTP connections (concurrent in-flight requests)
// ---------------------------------------------------------------------------
const activeConnections = new client.Gauge({
  name: `${PREFIX}active_connections`,
  help: 'Number of currently active HTTP connections',
});

// ---------------------------------------------------------------------------
// DB — Gauge: connection pool active connections
// ---------------------------------------------------------------------------
const dbPoolActiveConnections = new client.Gauge({
  name: `${PREFIX}db_pool_active_connections`,
  help: 'Number of active connections in the database pool',
});

// ---------------------------------------------------------------------------
// App — Histogram: request payload size
// ---------------------------------------------------------------------------
const httpRequestSize = new client.Histogram({
  name: `${PREFIX}http_request_size_bytes`,
  help: 'Size of HTTP request bodies in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000],
});

// ---------------------------------------------------------------------------
// App — Counter: app-level events (login, signup, order placed, etc.)
// ---------------------------------------------------------------------------
const appEventsTotal = new client.Counter({
  name: `${PREFIX}events_total`,
  help: 'Total application-level events',
  labelNames: ['event_type'],
});

module.exports = {
  client,
  httpRequestsTotal,
  httpErrorsTotal,
  httpRequestDuration,
  dbQueriesTotal,
  dbQueryDuration,
  activeConnections,
  dbPoolActiveConnections,
  httpRequestSize,
  appEventsTotal,
};

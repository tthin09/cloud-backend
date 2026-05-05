// =============================================================================
// middleware/metricsMiddleware.js — Express middleware for Prometheus HTTP metrics
// =============================================================================
// Instruments every incoming request with:
//   - app_http_requests_total   (Counter)
//   - app_http_errors_total     (Counter for 4xx/5xx)
//   - app_http_request_duration_seconds (Histogram)
//   - app_active_connections    (Gauge, inc on enter / dec on exit)
//   - app_http_request_size_bytes (Histogram)
// =============================================================================

const {
  httpRequestsTotal,
  httpErrorsTotal,
  httpRequestDuration,
  activeConnections,
  httpRequestSize,
} = require('../metrics');

/**
 * Normalise the Express route so cardinality stays low in Prometheus.
 * e.g.  /api/users/abc-123  →  /api/users/:uuid
 */
function normaliseRoute(req) {
  if (req.route && req.route.path) {
    return req.baseUrl + req.route.path;    // e.g. /api/users/:uuid
  }
  // Fallback: replace UUID-like segments
  return req.originalUrl
    .split('?')[0]
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:uuid'
    )
    .replace(/\/\d+/g, '/:id');
}

function metricsMiddleware(req, res, next) {
  // Skip the /metrics endpoint itself to avoid recursive counting
  if (req.path === '/metrics') return next();

  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  // Track request body size
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  // Hook into response finish
  res.on('finish', () => {
    const route = normaliseRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    end(labels);
    activeConnections.dec();

    if (contentLength > 0) {
      httpRequestSize.observe({ method: req.method, route }, contentLength);
    }

    // Count errors
    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
}

module.exports = metricsMiddleware;

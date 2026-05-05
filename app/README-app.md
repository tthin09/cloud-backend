# 🧑💻 Person 2 — Demo Application & Prometheus

> REST API application with integrated Prometheus metrics for the AWS Resource & Performance Monitoring system.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [API Endpoints](#api-endpoints)
- [Prometheus Metrics](#prometheus-metrics)
- [Quick Start](#quick-start)
- [Load Testing](#load-testing)
- [Coordination with Other Members](#coordination)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│  Node.js Express App (:8081)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Routes   │  │Middleware │  │   Metrics    │  │
│  │ /api/*    │→ │  timing   │→ │  prom-client │  │
│  └──────────┘  └──────────┘  └──────┬───────┘  │
│                                      │          │
│  ┌──────────┐               ┌───────▼───────┐  │
│  │  MySQL   │◄──────────────│  /metrics     │  │
│  │  (RDS)   │  instrumented │  (Prometheus) │  │
│  └──────────┘  queries      └───────────────┘  │
└─────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
  ┌─────────────┐           ┌──────────────┐
  │  RDS MySQL  │           │  Prometheus  │
  │  (Person 1) │           │  (:9090)     │
  └─────────────┘           └──────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 18 (Alpine) | Lightweight container |
| Framework | Express.js 4.x | REST API |
| Database | MySQL 8.0 | Persistent storage |
| DB Driver | mysql2/promise | Async MySQL queries |
| Metrics | prom-client 15.x | Prometheus instrumentation |
| Container | Docker | Deployment |

---

## 📡 API Endpoints

### System Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API overview with all available endpoints |
| `GET` | `/health` | Health check (uptime) |
| `GET` | `/ready` | Readiness check (DB connectivity) |
| `GET` | `/metrics` | Prometheus metrics endpoint |

### Users (`/api/users`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:uuid` | Get user by UUID |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:uuid` | Update user |
| `DELETE` | `/api/users/:uuid` | Delete user |

**POST/PUT body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "user"
}
```

### Products (`/api/products`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products?category=electronics` | Filter by category |
| `GET` | `/api/products/:uuid` | Get product by UUID |
| `POST` | `/api/products` | Create product |
| `PUT` | `/api/products/:uuid` | Update product |
| `DELETE` | `/api/products/:uuid` | Delete product |

**POST/PUT body:**
```json
{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "price": 29.99,
  "stock": 150,
  "category": "electronics"
}
```

### Orders (`/api/orders`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders` | List all orders (with user & product names) |
| `GET` | `/api/orders?status=pending` | Filter by status |
| `GET` | `/api/orders/:uuid` | Get order by UUID |
| `POST` | `/api/orders` | Place an order (validates stock) |
| `PATCH` | `/api/orders/:uuid/status` | Update order status |
| `DELETE` | `/api/orders/:uuid` | Delete order |

**POST body:**
```json
{
  "user_uuid": "abc-123-...",
  "product_uuid": "def-456-...",
  "quantity": 2
}
```

**PATCH body:**
```json
{
  "status": "shipped"
}
```
Valid statuses: `pending`, `processing`, `shipped`, `delivered`, `cancelled`

### Simulation Endpoints (`/api/simulate`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/simulate/error` | Returns random 5xx error |
| `GET` | `/api/simulate/slow?delay=3000` | Delays response by N ms |
| `GET` | `/api/simulate/cpu?iterations=1000000` | CPU-intensive operation |
| `GET` | `/api/simulate/memory?size=50` | Allocates N MB of memory |

---

## 📊 Prometheus Metrics

### Naming Convention

All custom metrics use the prefix `app_` (configurable via `METRICS_PREFIX` env var).  
Names follow [Prometheus naming best practices](https://prometheus.io/docs/practices/naming/).

### Custom Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `app_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests |
| `app_http_errors_total` | Counter | `method`, `route`, `status_code` | HTTP errors (4xx/5xx) |
| `app_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency |
| `app_http_request_size_bytes` | Histogram | `method`, `route` | Request body size |
| `app_db_queries_total` | Counter | `operation`, `table`, `success` | Database queries |
| `app_db_query_duration_seconds` | Histogram | `operation`, `table` | DB query latency |
| `app_active_connections` | Gauge | — | Current in-flight requests |
| `app_db_pool_active_connections` | Gauge | — | DB pool active connections |
| `app_events_total` | Counter | `event_type` | Application events |

### Default Metrics (auto-collected by prom-client)

- `app_process_cpu_*` — Process CPU usage
- `app_process_resident_memory_bytes` — Process memory
- `app_nodejs_eventloop_lag_*` — Event loop lag
- `app_nodejs_active_handles_total` — Active handles
- `app_nodejs_heap_*` — V8 heap statistics

### Example PromQL Queries

```promql
# Request rate (req/s)
rate(app_http_requests_total[5m])

# Error rate (%)
sum(rate(app_http_errors_total[5m])) / sum(rate(app_http_requests_total[5m])) * 100

# p95 response time
histogram_quantile(0.95, sum(rate(app_http_request_duration_seconds_bucket[5m])) by (le))

# p99 response time
histogram_quantile(0.99, sum(rate(app_http_request_duration_seconds_bucket[5m])) by (le))

# Request rate by route
sum(rate(app_http_requests_total[5m])) by (route)

# DB query rate by table
sum(rate(app_db_queries_total[5m])) by (table, operation)

# DB query latency p95
histogram_quantile(0.95, sum(rate(app_db_query_duration_seconds_bucket[5m])) by (le, table))

# Active connections
app_active_connections

# Application events
sum(rate(app_events_total[5m])) by (event_type)
```

---

## 🚀 Quick Start

### Option 1: Full Stack (Docker Compose)

```bash
# From the project root directory
docker-compose up -d

# Seed the database with sample data
docker exec -it monitoring-app node src/db/seed.js

# Verify
curl http://localhost:8081/health
curl http://localhost:8081/metrics
curl http://localhost:8081/api/users
```

### Option 2: App Only (local development)

```bash
cd app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MySQL connection details

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start the app
npm run dev
```

### Verify Metrics

```bash
# Check the /metrics endpoint
curl http://localhost:8081/metrics

# You should see output like:
# app_http_requests_total{method="GET",route="/health",status_code="200"} 1
# app_http_request_duration_seconds_bucket{...} ...
```

---

## 🔥 Load Testing

### Quick Test Script

```bash
cd app/load-test
chmod +x test-script.sh
./test-script.sh http://localhost:8081
```

The script runs 7 phases:
1. **Health checks** — Verify app is running
2. **CRUD traffic** — Create users, products
3. **Burst traffic** — 100 concurrent requests
4. **Error simulation** — 404s, 500s, 400s
5. **Latency simulation** — Slow responses (1s, 3s, 5s)
6. **Resource stress** — CPU and memory load
7. **Sustained load** — 30 seconds of continuous traffic

### Error Stress Test

```bash
chmod +x stress-errors.sh
./stress-errors.sh http://localhost:8081 60
```

Generates errors for 60 seconds to trigger Grafana alerts.

---

## 🔗 Coordination with Other Members {#coordination}

### For Person 1 (Infrastructure)

- **Dockerfile** is in `app/Dockerfile` — deploy this to EC2
- **Ports needed**: `8081` (app), `3306` (MySQL)
- **Health check**: `GET /health` returns `{"status":"ok"}`
- **Readiness check**: `GET /ready` checks DB connectivity
- App connects to MySQL via env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### For Person 3 (Grafana/Alerting)

**Agreed metric names:**

| Dashboard Panel | Metric | PromQL |
|----------------|--------|--------|
| Request Rate | `app_http_requests_total` | `rate(app_http_requests_total[5m])` |
| Error Rate | `app_http_errors_total` | `sum(rate(app_http_errors_total[5m])) / sum(rate(app_http_requests_total[5m]))` |
| Response Time p50 | `app_http_request_duration_seconds` | `histogram_quantile(0.50, ...)` |
| Response Time p95 | `app_http_request_duration_seconds` | `histogram_quantile(0.95, ...)` |
| Response Time p99 | `app_http_request_duration_seconds` | `histogram_quantile(0.99, ...)` |
| DB Query Rate | `app_db_queries_total` | `rate(app_db_queries_total[5m])` |
| DB Query Latency | `app_db_query_duration_seconds` | `histogram_quantile(0.95, ...)` |
| Active Connections | `app_active_connections` | Direct gauge value |
| App Events | `app_events_total` | `rate(app_events_total[5m])` |

---

## 📁 File Structure

```
app/
├── Dockerfile                      # Container image definition
├── .dockerignore                   # Docker build exclusions
├── .env.example                    # Environment variable template
├── package.json                    # Dependencies & scripts
├── src/
│   ├── index.js                    # Entry point (Express server)
│   ├── metrics.js                  # All Prometheus metric definitions
│   ├── db/
│   │   ├── connection.js           # MySQL pool with instrumentation
│   │   ├── migrate.js              # Table creation script
│   │   └── seed.js                 # Sample data seeder
│   ├── middleware/
│   │   ├── metricsMiddleware.js    # HTTP request instrumentation
│   │   └── errorHandler.js         # Centralised error handling
│   └── routes/
│       ├── users.js                # /api/users CRUD
│       ├── products.js             # /api/products CRUD
│       ├── orders.js               # /api/orders CRUD + status
│       └── simulate.js             # Chaos engineering endpoints
└── load-test/
    ├── test-script.sh              # Full traffic simulation
    └── stress-errors.sh            # Mass error generation

prometheus/
├── prometheus.yml                  # Scrape targets configuration
└── alert-rules.yml                 # Prometheus alerting rules
```

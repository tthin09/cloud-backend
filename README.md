# AWS Monitoring Demo Application

This directory contains the Demo REST API Application (built with Node.js and Express) that serves as the target for our AWS-based Resource and Performance Monitoring System. It generates real-world traffic, interactions, and exposes detailed metrics for Prometheus to scrape.

## 🚀 Features

- **RESTful API**: CRUD operations for resources like `/api/users` and `/api/products`.
- **Database Integration**: Connects to a MySQL/PostgreSQL RDS database.
- **Custom Metrics Collection**: Uses `prom-client` to expose metrics on the `/metrics` endpoint.
- **Dockerized**: Ready to be deployed on AWS EC2 or ECS using Docker.
- **Traffic Simulation**: Includes scripts (`load-test/test-script.sh`) to generate load and simulate errors for testing alerts and dashboards.

## 📊 Exposed Prometheus Metrics

The application automatically tracks and exposes the following metrics:

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `app_http_requests_total` | Counter | Total number of HTTP requests | `method`, `route`, `status_code` |
| `app_http_errors_total` | Counter | Total number of HTTP errors (5xx/4xx) | `method`, `route`, `status_code` |
| `app_db_queries_total` | Counter | Total number of database queries | `query_type`, `table` |
| `app_http_request_duration_seconds`| Histogram | HTTP response time latency | `method`, `route`, `status_code` |
| `app_db_query_duration_seconds` | Histogram | Database query execution time | `query_type` |
| `app_active_connections` | Gauge | Current number of active client connections | N/A |
| Node.js Standard Metrics | Various | CPU, memory, event loop lag, etc. | standard `prom-client` |

> Note: All custom metric names are prefixed with `app_` following Prometheus best practices.

## 📁 Directory Structure

```text
app/
├── Dockerfile             # Docker configuration for containerization
├── package.json           # Node.js dependencies and scripts
├── src/
│   ├── index.js           # Express app entry point & server setup
│   ├── metrics.js         # Prometheus custom metrics registry
│   ├── routes/            # API endpoints (users, products)
│   ├── middleware/        # Timing and metric collection middleware
│   └── db/                # Database connection and migrations
├── load-test/
│   ├── test-script.sh     # Bash script to simulate regular traffic
│   └── stress-test.js     # k6/Locust script for heavy load and errors
└── README.md              # Application documentation
```

## 🛠️ Setup & Installation

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file based on `.env.example`:
   ```env
   PORT=8081
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=password
   DB_NAME=demo_db
   ```

3. **Run database migrations & seeding (optional):**
   ```bash
   npm run migrate
   npm run seed
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```
   The app will run on `http://localhost:8081` and metrics on `http://localhost:8081/metrics`.

### Docker Deployment

To build and run the application using Docker:

```bash
docker build -t aws-monitoring-demo-app .
docker run -p 8081:8081 --env-file .env aws-monitoring-demo-app
```

## 🌐 API Endpoints

### 1. Application APIs

- `GET /api/users` - Retrieve a list of users
- `POST /api/users` - Create a new user
- `GET /api/products` - Retrieve a list of products
- `POST /api/products` - Create a new product
- `GET /api/error` - Intentional endpoint to generate 500 errors (for alert testing)
- `GET /api/slow` - Intentional endpoint to generate high latency (for histogram testing)

### 2. Monitoring Endpoint

- `GET /metrics` - Prometheus scrape target. Exposes all registered metrics in Prometheus text-based format.

## 🚦 Load Testing & Traffic Simulation

To ensure our Grafana dashboards have data and our Prometheus alerts are triggered, use the included load testing scripts.

**Simulate Normal Traffic:**
```bash
./load-test/test-script.sh
```

**Simulate Errors (Trigger Alerts):**
```bash
./load-test/test-script.sh --errors
```

## 🤝 Coordination with other roles

- **Person 1 (Infra):** Ensure port `8081` is exposed in the AWS EC2 Security Group and Docker deployment configurations.
- **Person 3 (Grafana):** When building Dashboards and PromQL queries, rely strictly on the exact metric names listed in the "Exposed Prometheus Metrics" section above.
"# cloud-backend" 

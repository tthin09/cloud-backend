#!/bin/bash
# =============================================================================
# load-test/test-script.sh — Traffic & stress simulation script
# =============================================================================
# Usage:
#   chmod +x test-script.sh
#   ./test-script.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:8081
# =============================================================================

set -e

BASE_URL="${1:-http://localhost:8081}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔥 Load Test Script — AWS Monitoring Demo          ║${NC}"
echo -e "${BLUE}║  Target: ${BASE_URL}                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ---------------------------------------------------------------------------
# Helper function: make a request and print result
# ---------------------------------------------------------------------------
request() {
  local method=$1
  local path=$2
  local data=$3
  local desc=$4

  echo -ne "  ${YELLOW}→${NC} ${desc}... "

  if [ -n "$data" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "${BASE_URL}${path}")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      "${BASE_URL}${path}")
  fi

  if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
    echo -e "${GREEN}${status} ✓${NC}"
  elif [ "$status" -ge 400 ]; then
    echo -e "${RED}${status} ✗${NC}"
  else
    echo -e "${YELLOW}${status}${NC}"
  fi
}

# ---------------------------------------------------------------------------
# Phase 1: Health Checks
# ---------------------------------------------------------------------------
echo -e "${GREEN}━━━ Phase 1: Health Checks ━━━${NC}"
request GET "/health" "" "Health check"
request GET "/ready" "" "Readiness check"
request GET "/" "" "API overview"
echo ""

# ---------------------------------------------------------------------------
# Phase 2: Normal CRUD Traffic
# ---------------------------------------------------------------------------
echo -e "${GREEN}━━━ Phase 2: Normal CRUD Traffic ━━━${NC}"

# Create users
for i in $(seq 1 5); do
  request POST "/api/users" \
    "{\"username\":\"loadtest_user_${i}_$(date +%s)\",\"email\":\"loadtest${i}_$(date +%s)@test.com\",\"full_name\":\"Load Test User ${i}\"}" \
    "Create user #${i}"
done

# List users
request GET "/api/users" "" "List all users"

# Create products
for i in $(seq 1 5); do
  price=$(echo "scale=2; $RANDOM / 1000" | bc)
  request POST "/api/products" \
    "{\"name\":\"Load Test Product ${i} $(date +%s)\",\"description\":\"Test product\",\"price\":${price},\"stock\":$((RANDOM % 100 + 10)),\"category\":\"test\"}" \
    "Create product #${i}"
done

# List products
request GET "/api/products" "" "List all products"
request GET "/api/products?category=test" "" "List products (filtered)"
echo ""

# ---------------------------------------------------------------------------
# Phase 3: Burst Traffic (rapid requests)
# ---------------------------------------------------------------------------
echo -e "${GREEN}━━━ Phase 3: Burst Traffic (50 rapid requests) ━━━${NC}"
echo -ne "  ${YELLOW}→${NC} Sending 50 rapid GET requests... "
for i in $(seq 1 50); do
  curl -s -o /dev/null "${BASE_URL}/api/users" &
done
wait
echo -e "${GREEN}Done ✓${NC}"

echo -ne "  ${YELLOW}→${NC} Sending 50 rapid GET /api/products... "
for i in $(seq 1 50); do
  curl -s -o /dev/null "${BASE_URL}/api/products" &
done
wait
echo -e "${GREEN}Done ✓${NC}"
echo ""

# ---------------------------------------------------------------------------
# Phase 4: Simulate Errors
# ---------------------------------------------------------------------------
echo -e "${RED}━━━ Phase 4: Error Simulation ━━━${NC}"

# 404 errors
for i in $(seq 1 10); do
  request GET "/api/users/nonexistent-uuid-${i}" "" "404 error #${i}"
done

# 5xx errors
for i in $(seq 1 10); do
  request GET "/api/simulate/error" "" "5xx error #${i}"
done

# 400 errors (bad input)
for i in $(seq 1 5); do
  request POST "/api/users" '{"email":"missing_username@test.com"}' "400 error #${i}"
done
echo ""

# ---------------------------------------------------------------------------
# Phase 5: Latency Simulation
# ---------------------------------------------------------------------------
echo -e "${YELLOW}━━━ Phase 5: Latency Simulation ━━━${NC}"
request GET "/api/simulate/slow?delay=1000" "" "Slow response (1s)"
request GET "/api/simulate/slow?delay=3000" "" "Slow response (3s)"
request GET "/api/simulate/slow?delay=5000" "" "Slow response (5s)"
echo ""

# ---------------------------------------------------------------------------
# Phase 6: Resource Stress
# ---------------------------------------------------------------------------
echo -e "${RED}━━━ Phase 6: Resource Stress ━━━${NC}"
request GET "/api/simulate/cpu?iterations=5000000" "" "CPU stress (5M iterations)"
request GET "/api/simulate/cpu?iterations=10000000" "" "CPU stress (10M iterations)"
request GET "/api/simulate/memory?size=50" "" "Memory allocation (50MB)"
request GET "/api/simulate/memory?size=100" "" "Memory allocation (100MB)"
echo ""

# ---------------------------------------------------------------------------
# Phase 7: Sustained Load
# ---------------------------------------------------------------------------
echo -e "${GREEN}━━━ Phase 7: Sustained Load (30 seconds) ━━━${NC}"
echo -ne "  ${YELLOW}→${NC} Sending continuous traffic for 30 seconds... "
end_time=$(($(date +%s) + 30))
count=0
while [ $(date +%s) -lt $end_time ]; do
  curl -s -o /dev/null "${BASE_URL}/api/users" &
  curl -s -o /dev/null "${BASE_URL}/api/products" &
  curl -s -o /dev/null "${BASE_URL}/health" &
  count=$((count + 3))
  sleep 0.1
done
wait
echo -e "${GREEN}Done ✓ (${count} requests sent)${NC}"
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Load test complete!                              ║${NC}"
echo -e "${BLUE}║  📊 Check Grafana: http://localhost:4000              ║${NC}"
echo -e "${BLUE}║  🔥 Check Prometheus: http://localhost:9090           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"

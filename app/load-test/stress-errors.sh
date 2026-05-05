#!/bin/bash
# =============================================================================
# load-test/stress-errors.sh — Mass error generation script
# =============================================================================
# Generates a large number of errors to trigger alert rules.
# Useful for testing Person 3's alert configurations.
#
# Usage:
#   chmod +x stress-errors.sh
#   ./stress-errors.sh [BASE_URL] [DURATION_SECONDS]
# =============================================================================

BASE_URL="${1:-http://localhost:8081}"
DURATION="${2:-60}"

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  Error Stress Test — Generating errors for ${DURATION} seconds${NC}"
echo -e "${YELLOW}Target: ${BASE_URL}${NC}"
echo ""

error_count=0
end_time=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  # Mix of different error types
  curl -s -o /dev/null "${BASE_URL}/api/simulate/error" &
  curl -s -o /dev/null "${BASE_URL}/api/users/nonexistent-$(date +%N)" &
  curl -s -o /dev/null -X POST -H "Content-Type: application/json" \
    -d '{}' "${BASE_URL}/api/users" &
  curl -s -o /dev/null "${BASE_URL}/api/simulate/slow?delay=5000" &
  curl -s -o /dev/null "${BASE_URL}/nonexistent/path" &
  
  error_count=$((error_count + 5))
  sleep 0.2
done

wait
echo ""
echo -e "${RED}🔥 Generated ~${error_count} error requests in ${DURATION} seconds${NC}"
echo -e "${YELLOW}📊 Check Grafana for alert triggers!${NC}"

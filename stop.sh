#!/usr/bin/env bash
# =============================================================================
#  CogniGrid AI — Stop Platform
#
#  Usage: ./stop.sh
#  Stops the Vite frontend, the Spring Boot Gateway and every Docker service
#  managed by docker-compose.yml.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGS_DIR="$ROOT_DIR/logs"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
sep()  { echo -e "${YELLOW}────────────────────────────────────────────────────${RESET}"; }
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }

sep
echo -e "${CYAN}   CogniGrid AI — Stopping Platform${RESET}"
sep

# ─── Frontend ────────────────────────────────────────────────────────────────
info "Stopping the Frontend..."
if [[ -f "$LOGS_DIR/frontend.pid" ]]; then
  kill "$(cat "$LOGS_DIR/frontend.pid")" 2>/dev/null || true
  rm -f "$LOGS_DIR/frontend.pid"
fi
pkill -f "vite" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
ok "Frontend stopped."

# ─── Gateway ─────────────────────────────────────────────────────────────────
info "Stopping the Gateway..."
if [[ -f "$LOGS_DIR/gateway.pid" ]]; then
  kill "$(cat "$LOGS_DIR/gateway.pid")" 2>/dev/null || true
  rm -f "$LOGS_DIR/gateway.pid"
fi
pkill -f "spring-boot:run"   2>/dev/null || true
pkill -f "GatewayApplication" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
ok "Gateway stopped."

# ─── Docker services ─────────────────────────────────────────────────────────
info "Stopping Docker services..."
cd "$ROOT_DIR"
docker compose stop 2>&1 | grep -E "^( ✔| ✗|error)" | sort -u || true
ok "All Docker services stopped."

sep
echo -e "${GREEN}   Platform stopped.${RESET}"
sep

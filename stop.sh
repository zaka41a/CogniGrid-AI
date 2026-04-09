#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# CogniGrid AI — Stop Platform
# Usage: ./stop.sh
# ─────────────────────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

sep()  { echo -e "${YELLOW}────────────────────────────────────────────────────${RESET}"; }
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }

sep
echo -e "${CYAN}   CogniGrid AI — Stopping Platform${RESET}"
sep

# ── Stop Frontend ─────────────────────────────────────────────────────────────
info "Stopping Frontend..."
if [ -f "$ROOT_DIR/logs/frontend.pid" ]; then
  kill $(cat "$ROOT_DIR/logs/frontend.pid") 2>/dev/null || true
  rm "$ROOT_DIR/logs/frontend.pid"
fi
pkill -f "vite" 2>/dev/null || true
ok "Frontend stopped"

# ── Stop Gateway ──────────────────────────────────────────────────────────────
info "Stopping Gateway..."
if [ -f "$ROOT_DIR/logs/gateway.pid" ]; then
  kill $(cat "$ROOT_DIR/logs/gateway.pid") 2>/dev/null || true
  rm "$ROOT_DIR/logs/gateway.pid"
fi
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "GatewayApplication" 2>/dev/null || true
ok "Gateway stopped"

# ── Stop Docker services ──────────────────────────────────────────────────────
info "Stopping Docker services..."
cd "$ROOT_DIR"
docker compose down
ok "All Docker services stopped"

sep
echo -e "${GREEN}   Platform stopped.${RESET}"
sep

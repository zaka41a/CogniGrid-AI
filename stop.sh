#!/usr/bin/env bash
# =============================================================================
#  CogniGrid AI — Stop Platform
#
#  Usage:
#    ./stop.sh           Stop frontend + gateway, leave Docker services up.
#    ./stop.sh --all     Also stop every Docker service (databases included).
#
#  Idempotent: re-running on an already-stopped platform is a no-op.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGS_DIR="$ROOT_DIR/logs"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
sep()  { echo -e "${YELLOW}────────────────────────────────────────────────────${RESET}"; }
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }

STOP_DOCKER=false
[[ "${1:-}" == "--all" ]] && STOP_DOCKER=true

sep
echo -e "${CYAN}   CogniGrid AI — Stopping Platform${RESET}"
$STOP_DOCKER && echo -e "${YELLOW}   Mode: --all (Docker services included)${RESET}"
sep

# Helper: kill a PID listed in a pidfile, then delete the pidfile.
# CRITICAL: must reject PID 0 and PID 1. `kill 0` in POSIX sends SIGTERM
# to every process in the caller's process group — i.e. it kills this
# very script and the terminal. A stray "0" or empty pidfile would make
# stop.sh euthanise itself, which is exactly what was happening.
kill_pidfile() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] || return 0
  local pid
  pid=$(cat "$pidfile" 2>/dev/null || echo "")
  rm -f "$pidfile"
  # Reject empty / non-numeric / dangerous PIDs (0, 1)
  [[ "$pid" =~ ^[0-9]+$ ]] || return 0
  (( pid > 1 )) || return 0
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in {1..5}; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$pid" 2>/dev/null || true
  fi
}

# Helper: kill anything listening on a TCP port. Uses -r so empty input is a no-op.
kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs -r kill -9 2>/dev/null || true
  fi
}

# ─── Frontend ────────────────────────────────────────────────────────────────
info "Stopping the Frontend (Vite, port 5173)..."
kill_pidfile "$LOGS_DIR/frontend.pid"
# Vite spawns a child node process; match the exact bin to avoid matching the
# user's editor or shell window that happens to contain "vite" in the cwd.
pkill -f "node .*/vite/bin/vite\.js" 2>/dev/null || true
pkill -f "/vite$" 2>/dev/null || true
kill_port 5173
ok "Frontend stopped."

# ─── Gateway ─────────────────────────────────────────────────────────────────
info "Stopping the Gateway (Spring Boot, port 8080)..."
kill_pidfile "$LOGS_DIR/gateway.pid"
# Match the JAR path explicitly. This must NOT match the running shell or
# editor processes — a bare "GatewayApplication" pattern matched too widely
# on dev machines and was killing stop.sh itself.
pkill -f "gateway-0.0.1-SNAPSHOT\.jar" 2>/dev/null || true
pkill -f "spring-boot:run" 2>/dev/null || true
kill_port 8080
ok "Gateway stopped."

# ─── Docker services (only with --all) ───────────────────────────────────────
if $STOP_DOCKER; then
  info "Stopping Docker services..."
  cd "$ROOT_DIR"
  # 60s timeout so a misbehaving container can't hang the script forever.
  docker compose stop -t 60 2>&1 | grep -E "^( ✔| ✗|error)" || true
  ok "All Docker services stopped."
else
  info "Docker services left running. Use ./stop.sh --all to also stop them."
fi

sep
echo -e "${GREEN}   Platform stopped.${RESET}"
sep

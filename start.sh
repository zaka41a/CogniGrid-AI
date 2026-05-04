#!/usr/bin/env bash
# =============================================================================
#  CogniGrid AI — Start Platform
#
#  Usage:
#    ./start.sh             Fast start using existing images (default).
#    ./start.sh --rebuild   Force a full rebuild of every Docker image and
#                           the Spring Boot Gateway JAR.
#
#  Idempotent: services that are already healthy are left running. Running
#  twice in a row is safe.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
GATEWAY_DIR="$ROOT_DIR/backend/gateway"
LOGS_DIR="$ROOT_DIR/logs"

# ─── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
sep()  { echo -e "${YELLOW}────────────────────────────────────────────────────${RESET}"; }
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠   $1${RESET}"; }
err()  { echo -e "${RED}❌  $1${RESET}"; exit 1; }
skip() { echo -e "${GREEN}⏭   $1${RESET}"; }

# Helper: safe port killer — won't run kill with empty args
kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs -r kill -9 2>/dev/null || true
  fi
}

# Helper: is something already responding on this URL?
is_up() {
  curl -fsS -m 3 "$1" >/dev/null 2>&1
}

# ─── Args ────────────────────────────────────────────────────────────────────
FORCE_REBUILD=false
[[ "${1:-}" == "--rebuild" ]] && FORCE_REBUILD=true

sep
echo -e "${CYAN}   CogniGrid AI — Starting Platform${RESET}"
if $FORCE_REBUILD; then
  echo -e "${YELLOW}   Mode: Force rebuild (Docker images + Gateway JAR)${RESET}"
else
  echo -e "${GREEN}   Mode: Fast start (no rebuild)${RESET}"
fi
sep

# ─── Pre-flight checks ───────────────────────────────────────────────────────
[[ -f "$ROOT_DIR/.env" ]] || err ".env not found — copy .env.example to .env and fill in the values."

info "Checking dependencies..."
command -v docker >/dev/null 2>&1 || err "Docker is not installed."
command -v mvn    >/dev/null 2>&1 || err "Maven is not installed."
command -v npm    >/dev/null 2>&1 || err "Node / npm is not installed."
ok "Docker, Maven and Node found."

mkdir -p "$LOGS_DIR"

# ─── Docker Desktop (macOS) ──────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  info "Starting Docker Desktop..."
  open -a Docker || true
  echo -n "  Waiting for Docker"
  until docker info >/dev/null 2>&1; do echo -n "."; sleep 2; done
  echo ""
  ok "Docker Desktop is ready."
fi

# Strip the obsolete "version:" key from docker-compose.yml if present
sed -i '' '/^version:/d' "$ROOT_DIR/docker-compose.yml" 2>/dev/null || true

# ─── Infrastructure (databases & object stores) ──────────────────────────────
info "Starting infrastructure (Postgres, Neo4j, Redis, Qdrant, MinIO)..."
cd "$ROOT_DIR"
docker compose up -d postgres neo4j redis qdrant minio >/dev/null

info "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U cognigrid -d cognigrid >/dev/null 2>&1; do sleep 2; done
ok "PostgreSQL is ready."

info "Waiting for Redis..."
until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do sleep 2; done
ok "Redis is ready."

info "Waiting for Neo4j (Bolt protocol)..."
NEO4J_PASS_VAL=$(grep "^NEO4J_PASSWORD=" "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | head -1)
MAX_NEO4J=180 ; WAITED_NEO4J=0 ; NEO4J_READY=false
until docker compose exec -T neo4j cypher-shell -u neo4j -p "${NEO4J_PASS_VAL:-cg_neo4j_2024}" "RETURN 1" >/dev/null 2>&1; do
  sleep 3
  WAITED_NEO4J=$((WAITED_NEO4J + 3))
  if [[ $WAITED_NEO4J -ge $MAX_NEO4J ]]; then
    warn "Neo4j is not ready after ${MAX_NEO4J}s — the Graph Service will fail to start."
    break
  fi
done
if [[ $WAITED_NEO4J -lt $MAX_NEO4J ]]; then
  NEO4J_READY=true
  ok "Neo4j is ready (took ${WAITED_NEO4J}s)."
fi

# ─── Python microservices ────────────────────────────────────────────────────
PYTHON_SERVICES="ingestion graph ai-engine graphrag agent"

if $FORCE_REBUILD; then
  info "Rebuilding and starting Python microservices..."
  DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 \
    docker compose up -d --build $PYTHON_SERVICES 2>&1 | tee "$LOGS_DIR/docker-build.log" >/dev/null \
    || warn "One or more services failed to build — see $LOGS_DIR/docker-build.log"
else
  info "Starting Python microservices (using existing images)..."
  docker compose up -d $PYTHON_SERVICES 2>&1 | tee "$LOGS_DIR/docker-start.log" >/dev/null \
    || warn "Some services failed to start — try ./start.sh --rebuild on first run."
fi
ok "Python microservices started (ingestion:8001 graph:8002 ai-engine:8003 graphrag:8004 agent:8005)."

# If the Graph service crashed because Neo4j wasn't ready, restart it now.
sleep 5
if ! is_up http://localhost:8002/health; then
  warn "Graph service not responding — restarting (Neo4j was slow to wake)..."
  docker compose restart graph >/dev/null 2>&1 || true
  for _ in {1..20}; do
    is_up http://localhost:8002/health && break
    sleep 2
  done
  if is_up http://localhost:8002/health; then
    ok "Graph service is back online."
  else
    warn "Graph service still offline — check 'docker logs cg-graph'."
  fi
fi

# ─── ASSUME Runner ───────────────────────────────────────────────────────────
info "Starting ASSUME Runner..."
docker compose up -d assume-runner >> "$LOGS_DIR/docker-start.log" 2>&1 || warn "ASSUME Runner failed to start."
ok "ASSUME Runner is up (port 8006)."

# ─── Monitoring ──────────────────────────────────────────────────────────────
info "Starting monitoring (Prometheus + Grafana)..."
docker compose up -d prometheus grafana >/dev/null
ok "Monitoring is up."

# ─── Spring Boot Gateway ─────────────────────────────────────────────────────
# Skip rebuild & relaunch if a Gateway is already healthy and we're not in
# --rebuild mode. This makes ./start.sh safe to re-run after partial crashes.
if ! $FORCE_REBUILD && is_up http://localhost:8080/actuator/health; then
  skip "Gateway already running on :8080 — leaving it untouched."
else
  GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)

  if $FORCE_REBUILD || [[ -z "$GATEWAY_JAR" ]]; then
    info "Building the Gateway (Spring Boot)..."
    ( cd "$GATEWAY_DIR" && mvn package -DskipTests -q ) || err "Maven build of the Gateway failed."
    GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)
  else
    info "Reusing existing Gateway JAR (skipping Maven build)."
  fi
  [[ -n "$GATEWAY_JAR" ]] || err "Gateway JAR not found."

  # Stop any previous Gateway instance and free port 8080.
  # NEVER call `kill` with PID 0 or 1 — POSIX defines `kill 0` as
  # "signal every process in the current process group", which would
  # kill this script and the parent terminal.
  if [[ -f "$LOGS_DIR/gateway.pid" ]]; then
    _gw_pid=$(cat "$LOGS_DIR/gateway.pid" 2>/dev/null || echo "")
    rm -f "$LOGS_DIR/gateway.pid"
    if [[ "$_gw_pid" =~ ^[0-9]+$ ]] && (( _gw_pid > 1 )); then
      kill "$_gw_pid" 2>/dev/null || true
    fi
  fi
  kill_port 8080
  echo -n "  Waiting for port 8080 to be free"
  for _ in {1..15}; do
    lsof -ti:8080 >/dev/null 2>&1 || break
    echo -n "."; sleep 1
  done
  echo ""

  # Read env vars for the Gateway
  _env() { grep "^${1}=" "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | head -1; }
  PG_USER=$(_env POSTGRES_USER)
  PG_PASS=$(_env POSTGRES_PASSWORD)
  PG_DB=$(_env POSTGRES_DB)
  JWT_SECRET_VAL=$(_env JWT_SECRET)
  JWT_EXP=$(_env JWT_EXPIRATION_MS)
  JWT_REF_EXP=$(_env JWT_REFRESH_EXPIRATION_MS)
  CORS_VAL=$(_env CORS_ORIGINS)

  info "Starting the Gateway (java -jar)..."
  GATEWAY_JAR_NAME=$(basename "$GATEWAY_JAR")
  ( cd "$GATEWAY_DIR/target" && \
    nohup java \
      -DSPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/${PG_DB}" \
      -DSPRING_DATASOURCE_USERNAME="${PG_USER}" \
      -DSPRING_DATASOURCE_PASSWORD="${PG_PASS}" \
      -DSPRING_DATA_REDIS_HOST=localhost \
      -DSPRING_DATA_REDIS_PORT=6379 \
      -DJWT_SECRET="${JWT_SECRET_VAL}" \
      -DJWT_EXPIRATION_MS="${JWT_EXP}" \
      -DJWT_REFRESH_EXPIRATION_MS="${JWT_REF_EXP}" \
      -DCORS_ORIGINS="${CORS_VAL}" \
      -jar "$GATEWAY_JAR_NAME" \
      > "$LOGS_DIR/gateway.log" 2>&1 < /dev/null & \
    echo $! > "$LOGS_DIR/gateway.pid"
  )

  GATEWAY_PID=$(cat "$LOGS_DIR/gateway.pid" 2>/dev/null || echo "")
  [[ -n "$GATEWAY_PID" ]] || err "Failed to capture Gateway PID."

  info "Waiting for the Gateway on port 8080 (cold start can take 4–5 min)..."
  MAX_WAIT=360 ; WAITED=0
  until is_up http://localhost:8080/actuator/health; do
    # Stop early if the Java process died
    if ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
      err "Gateway process exited unexpectedly — see $LOGS_DIR/gateway.log."
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    if (( WAITED % 30 == 0 )); then
      echo "  …still waiting (${WAITED}s / ${MAX_WAIT}s)"
    fi
    if [[ $WAITED -ge $MAX_WAIT ]]; then
      err "Gateway did not start within ${MAX_WAIT}s — see $LOGS_DIR/gateway.log."
    fi
  done
  ok "Gateway is ready — http://localhost:8080 (took ${WAITED}s)"
fi

# ─── Frontend (Vite) ─────────────────────────────────────────────────────────
if is_up http://localhost:5173; then
  skip "Frontend already running on :5173 — leaving it untouched."
else
  info "Starting the Frontend (Vite)..."
  cd "$FRONTEND_DIR"

  if [[ ! -d "node_modules" ]]; then
    info "Installing npm dependencies..."
    npm install -q
  fi

  if [[ -f "$LOGS_DIR/frontend.pid" ]]; then
    _fe_pid=$(cat "$LOGS_DIR/frontend.pid" 2>/dev/null || echo "")
    rm -f "$LOGS_DIR/frontend.pid"
    if [[ "$_fe_pid" =~ ^[0-9]+$ ]] && (( _fe_pid > 1 )); then
      kill "$_fe_pid" 2>/dev/null || true
    fi
  fi
  kill_port 5173

  # Use nohup + setsid so the child survives if the launching shell dies,
  # and capture the *child* PID (not this script's $!) into the pidfile.
  nohup npm run dev > "$LOGS_DIR/frontend.log" 2>&1 < /dev/null &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" > "$LOGS_DIR/frontend.pid"
  disown "$FRONTEND_PID" 2>/dev/null || true

  # Wait up to 30s for Vite to listen on 5173
  for _ in {1..30}; do
    is_up http://localhost:5173 && break
    sleep 1
  done
  if is_up http://localhost:5173; then
    ok "Frontend is ready — http://localhost:5173"
  else
    warn "Frontend did not respond within 30s — check $LOGS_DIR/frontend.log."
  fi
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
sep
echo -e "${GREEN}   CogniGrid AI Platform is online!${RESET}"
sep
echo ""
echo -e "  ${CYAN}Frontend${RESET}      →  http://localhost:5173"
echo -e "  ${CYAN}Gateway API${RESET}   →  http://localhost:8080"
echo -e "  ${CYAN}Ingestion${RESET}     →  http://localhost:8001/docs"
echo -e "  ${CYAN}Graph${RESET}         →  http://localhost:8002/docs"
echo -e "  ${CYAN}AI Engine${RESET}     →  http://localhost:8003/docs"
echo -e "  ${CYAN}GraphRAG${RESET}      →  http://localhost:8004/docs"
echo -e "  ${CYAN}Agent${RESET}         →  http://localhost:8005/docs"
echo -e "  ${CYAN}ASSUME Runner${RESET} →  http://localhost:8006/docs"
echo -e "  ${CYAN}Neo4j${RESET}         →  http://localhost:7474"
echo -e "  ${CYAN}MinIO${RESET}         →  http://localhost:9001"
echo -e "  ${CYAN}Grafana${RESET}       →  http://localhost:3001"
echo -e "  ${CYAN}Prometheus${RESET}    →  http://localhost:9090"
echo ""
echo -e "  Default admin → ${YELLOW}admin@gmail.com / admin4321${RESET}"
echo ""
echo -e "  Stop          →  ${YELLOW}./stop.sh${RESET}        (frontend + gateway only)"
echo -e "  Stop all      →  ${YELLOW}./stop.sh --all${RESET}  (also Docker services)"
echo -e "  Rebuild       →  ${YELLOW}./start.sh --rebuild${RESET}"
sep

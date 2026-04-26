#!/usr/bin/env bash
# =============================================================================
#  CogniGrid AI — Start Platform
#
#  Usage:
#    ./start.sh             Fast start using existing images (default).
#    ./start.sh --rebuild   Force a full rebuild of every Docker image and
#                           the Spring Boot Gateway JAR.
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
MAX_NEO4J=90 ; WAITED_NEO4J=0
until docker compose exec -T neo4j cypher-shell -u neo4j -p "${NEO4J_PASS_VAL:-cg_neo4j_2024}" "RETURN 1" >/dev/null 2>&1; do
  sleep 3
  WAITED_NEO4J=$((WAITED_NEO4J + 3))
  if [[ $WAITED_NEO4J -ge $MAX_NEO4J ]]; then
    warn "Neo4j is not ready after ${MAX_NEO4J}s — the Graph Service may fail to start."
    break
  fi
done
ok "Neo4j is ready."

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

# ─── ASSUME Runner ───────────────────────────────────────────────────────────
info "Starting ASSUME Runner..."
docker compose up -d assume-runner >> "$LOGS_DIR/docker-start.log" 2>&1 || warn "ASSUME Runner failed to start."
ok "ASSUME Runner is up (port 8006)."

# ─── Monitoring ──────────────────────────────────────────────────────────────
info "Starting monitoring (Prometheus + Grafana)..."
docker compose up -d prometheus grafana >/dev/null
ok "Monitoring is up."

# ─── Spring Boot Gateway ─────────────────────────────────────────────────────
GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)

if $FORCE_REBUILD || [[ -z "$GATEWAY_JAR" ]]; then
  info "Building the Gateway (Spring Boot)..."
  ( cd "$GATEWAY_DIR" && mvn package -DskipTests -q ) || err "Maven build of the Gateway failed."
  GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)
else
  info "Reusing existing Gateway JAR (skipping Maven build)."
fi
[[ -n "$GATEWAY_JAR" ]] || err "Gateway JAR not found."

# Read env vars for the Gateway
_env() { grep "^${1}=" "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | head -1; }
PG_USER=$(_env POSTGRES_USER)
PG_PASS=$(_env POSTGRES_PASSWORD)
PG_DB=$(_env POSTGRES_DB)
JWT_SECRET_VAL=$(_env JWT_SECRET)
JWT_EXP=$(_env JWT_EXPIRATION_MS)
JWT_REF_EXP=$(_env JWT_REFRESH_EXPIRATION_MS)
CORS_VAL=$(_env CORS_ORIGINS)

# Stop any previous Gateway instance and free port 8080
if [[ -f "$LOGS_DIR/gateway.pid" ]]; then
  kill "$(cat "$LOGS_DIR/gateway.pid")" 2>/dev/null || true
  rm -f "$LOGS_DIR/gateway.pid"
fi
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
echo -n "  Waiting for port 8080 to be free"
for _ in {1..15}; do
  lsof -ti:8080 >/dev/null 2>&1 || break
  echo -n "."; sleep 1
done
echo ""

info "Starting the Gateway (java -jar)..."
GATEWAY_JAR_NAME=$(basename "$GATEWAY_JAR")
( cd "$GATEWAY_DIR/target" && \
  java \
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
    > "$LOGS_DIR/gateway.log" 2>&1 ) &

GATEWAY_PID=$!
echo "$GATEWAY_PID" > "$LOGS_DIR/gateway.pid"

info "Waiting for the Gateway on port 8080..."
MAX_WAIT=150 ; WAITED=0
until curl -fs http://localhost:8080/actuator/health >/dev/null 2>&1; do
  sleep 3
  WAITED=$((WAITED + 3))
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    err "Gateway did not start within ${MAX_WAIT}s — see $LOGS_DIR/gateway.log."
  fi
done
ok "Gateway is ready — http://localhost:8080"

# ─── Frontend (Vite) ─────────────────────────────────────────────────────────
info "Starting the Frontend (Vite)..."
cd "$FRONTEND_DIR"

if [[ ! -d "node_modules" ]]; then
  info "Installing npm dependencies..."
  npm install -q
fi

if [[ -f "$LOGS_DIR/frontend.pid" ]]; then
  kill "$(cat "$LOGS_DIR/frontend.pid")" 2>/dev/null || true
  rm -f "$LOGS_DIR/frontend.pid"
fi
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$LOGS_DIR/frontend.pid"

sleep 3
ok "Frontend is ready — http://localhost:5173"

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
echo -e "  Stop          →  ${YELLOW}./stop.sh${RESET}"
echo -e "  Rebuild       →  ${YELLOW}./start.sh --rebuild${RESET}"
sep

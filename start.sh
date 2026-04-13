#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# CogniGrid AI  Start Platform
# Usage: ./start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
GATEWAY_DIR="$ROOT_DIR/backend/gateway"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

sep()  { echo -e "${YELLOW}────────────────────────────────────────────────────${RESET}"; }
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
err()  { echo -e "${RED}❌  $1${RESET}"; }

sep
echo -e "${CYAN}   CogniGrid AI — Starting Platform${RESET}"
sep

# ── Check .env ────────────────────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
  err ".env not found copy .env.example and fill in your values"
  exit 1
fi

# ── Check dependencies ────────────────────────────────────────────────────────
info "Checking dependencies..."

command -v docker   >/dev/null 2>&1 || { err "Docker not installed"; exit 1; }
command -v mvn      >/dev/null 2>&1 || { err "Maven not installed"; exit 1; }
command -v npm      >/dev/null 2>&1 || { err "Node/npm not installed"; exit 1; }

ok "Docker, Maven, Node found"

# ── Start Docker Desktop (Mac) ────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  info "Starting Docker Desktop..."
  open -a Docker
  echo -n "  Waiting for Docker"
  until docker info >/dev/null 2>&1; do
    echo -n "."
    sleep 2
  done
  echo ""
  ok "Docker Desktop ready"
fi

# ── Remove obsolete version field from docker-compose.yml ─────────────────────
sed -i '' '/^version:/d' "$ROOT_DIR/docker-compose.yml" 2>/dev/null || true

# ── Start Databases ───────────────────────────────────────────────────────────
info "Starting databases & stores (Docker)..."

cd "$ROOT_DIR"
docker compose up -d postgres neo4j redis qdrant minio

# ── Wait for PostgreSQL ───────────────────────────────────────────────────────
info "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U cognigrid -d cognigrid >/dev/null 2>&1; do
  sleep 2
done
ok "PostgreSQL ready"

# ── Wait for Redis ────────────────────────────────────────────────────────────
info "Waiting for Redis..."
until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do
  sleep 2
done
ok "Redis ready"

# ── Start Monitoring ──────────────────────────────────────────────────────────
info "Starting monitoring (Prometheus + Grafana)..."
docker compose up -d prometheus grafana
ok "Monitoring started"

# ── Start Gateway (Spring Boot) ───────────────────────────────────────────────
info "Building Gateway (Spring Boot)..."

# NOTE: mvn spring-boot:run cannot work because colons in the project path
# (My-Projects-Java:python:go) are interpreted as classpath separators by the JVM.
# Solution: build a fat JAR with mvn package and run with java -jar.
cd "$GATEWAY_DIR"
mvn package -DskipTests -q 2>&1

GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)
if [ -z "$GATEWAY_JAR" ]; then
  err "Gateway JAR not found — build failed"
  exit 1
fi

# Load env vars for gateway (resolve from .env)
PG_USER=$(grep ^POSTGRES_USER "$ROOT_DIR/.env" | cut -d= -f2)
PG_PASS=$(grep ^POSTGRES_PASSWORD "$ROOT_DIR/.env" | cut -d= -f2)
PG_DB=$(grep ^POSTGRES_DB "$ROOT_DIR/.env" | cut -d= -f2)
JWT_SECRET_VAL=$(grep ^JWT_SECRET "$ROOT_DIR/.env" | cut -d= -f2)
JWT_EXP=$(grep ^JWT_EXPIRATION_MS "$ROOT_DIR/.env" | cut -d= -f2)
JWT_REF_EXP=$(grep ^JWT_REFRESH_EXPIRATION_MS "$ROOT_DIR/.env" | cut -d= -f2)
CORS_VAL=$(grep ^CORS_ORIGINS "$ROOT_DIR/.env" | cut -d= -f2)

info "Starting Gateway (java -jar)..."
# NOTE: must cd into the target dir — colons in the project path would be
# interpreted as classpath separators by the JVM if we used the full path.
GATEWAY_JAR_NAME=$(basename "$GATEWAY_JAR")
cd "$GATEWAY_DIR/target"
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
  > "$ROOT_DIR/logs/gateway.log" 2>&1 &
GATEWAY_PID=$!
echo $GATEWAY_PID > "$ROOT_DIR/logs/gateway.pid"

info "Waiting for Gateway on port 8080..."
MAX_WAIT=60
WAITED=0
until curl -s http://localhost:8080/actuator/health >/dev/null 2>&1; do
  sleep 3
  WAITED=$((WAITED + 3))
  if [ $WAITED -ge $MAX_WAIT ]; then
    err "Gateway did not start in ${MAX_WAIT}s — check logs/gateway.log"
    exit 1
  fi
done
ok "Gateway ready — http://localhost:8080"

# ── Start Frontend (Vite) ─────────────────────────────────────────────────────
info "Starting Frontend (Vite)..."

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  info "Installing npm dependencies..."
  npm install -q
fi

npm run dev > "$ROOT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$ROOT_DIR/logs/frontend.pid"

sleep 3
ok "Frontend ready — http://localhost:5173"

# ── Summary ───────────────────────────────────────────────────────────────────
sep
echo -e "${GREEN}   Platform is running!${RESET}"
sep
echo ""
echo -e "  ${CYAN}Frontend${RESET}     →  http://localhost:5173"
echo -e "  ${CYAN}Gateway API${RESET}  →  http://localhost:8080"
echo -e "  ${CYAN}Swagger UI${RESET}   →  http://localhost:8080/swagger-ui.html"
echo -e "  ${CYAN}Neo4j${RESET}        →  http://localhost:7474"
echo -e "  ${CYAN}MinIO${RESET}        →  http://localhost:9001"
echo -e "  ${CYAN}Grafana${RESET}      →  http://localhost:3001"
echo -e "  ${CYAN}Prometheus${RESET}   →  http://localhost:9090"
echo ""
echo -e "  Logs →  $ROOT_DIR/logs/"
echo ""
echo -e "  To stop everything: ${YELLOW}./stop.sh${RESET}"
sep

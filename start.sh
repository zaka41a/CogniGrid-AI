#!/bin/bash
# =============================================================================
#  CogniGrid AI — Start Platform
#  Usage : ./start.sh            → démarrage rapide (images existantes, pas de build)
#          ./start.sh --rebuild  → force rebuild complet de toutes les images
# =============================================================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
GATEWAY_DIR="$ROOT_DIR/backend/gateway"
LOGS_DIR="$ROOT_DIR/logs"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

sep()  { echo -e "${YELLOW}────────────────────────────────────────────────────${RESET}"; }
info() { echo -e "${CYAN}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
err()  { echo -e "${RED}❌  $1${RESET}"; exit 1; }
warn() { echo -e "${YELLOW}⚠   $1${RESET}"; }

FORCE_REBUILD=false
[[ "$1" == "--rebuild" ]] && FORCE_REBUILD=true

sep
echo -e "${CYAN}   CogniGrid AI — Starting Platform${RESET}"
if [[ "$FORCE_REBUILD" == true ]]; then
  echo -e "${YELLOW}   Mode: Force Rebuild (images + Gateway)${RESET}"
else
  echo -e "${GREEN}   Mode: Fast Start (no rebuild)${RESET}"
fi
sep

# ── Vérification .env ─────────────────────────────────────────────────────────
[[ ! -f "$ROOT_DIR/.env" ]] && err ".env not found — copier .env.example et remplir les valeurs"

# ── Dépendances ───────────────────────────────────────────────────────────────
info "Vérification des dépendances..."
command -v docker >/dev/null 2>&1 || err "Docker non installé"
command -v mvn    >/dev/null 2>&1 || err "Maven non installé"
command -v npm    >/dev/null 2>&1 || err "Node/npm non installé"
ok "Docker, Maven, Node trouvés"

# ── Création du répertoire logs ───────────────────────────────────────────────
mkdir -p "$LOGS_DIR"

# ── Docker Desktop (Mac) ──────────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  info "Démarrage de Docker Desktop..."
  open -a Docker
  echo -n "  Attente Docker"
  until docker info >/dev/null 2>&1; do echo -n "."; sleep 2; done
  echo ""
  ok "Docker Desktop prêt"
fi

# ── Nettoyage docker-compose.yml (version: obsolète) ─────────────────────────
sed -i '' '/^version:/d' "$ROOT_DIR/docker-compose.yml" 2>/dev/null || true

# ── Infrastructure (Databases & Stores) ──────────────────────────────────────
info "Démarrage de l'infrastructure (Docker)..."
cd "$ROOT_DIR"
docker compose up -d postgres neo4j redis qdrant minio

# ── Attente PostgreSQL ────────────────────────────────────────────────────────
info "Attente PostgreSQL..."
until docker compose exec -T postgres pg_isready -U cognigrid -d cognigrid >/dev/null 2>&1; do
  sleep 2
done
ok "PostgreSQL prêt"

# ── Attente Redis ─────────────────────────────────────────────────────────────
info "Attente Redis..."
until docker compose exec -T redis redis-cli ping >/dev/null 2>&1; do
  sleep 2
done
ok "Redis prêt"

# ── Attente Neo4j Bolt (port 7687) ────────────────────────────────────────────
info "Attente Neo4j Bolt (nécessaire pour le Graph Service)..."
MAX_NEO4J=90
WAITED_NEO4J=0
NEO4J_PASS_VAL=$(grep "^NEO4J_PASSWORD=" "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | head -1)
until docker compose exec -T neo4j cypher-shell -u neo4j -p "${NEO4J_PASS_VAL:-cg_neo4j_2024}" "RETURN 1" >/dev/null 2>&1; do
  sleep 3
  WAITED_NEO4J=$((WAITED_NEO4J + 3))
  if [[ $WAITED_NEO4J -ge $MAX_NEO4J ]]; then
    warn "Neo4j non prêt après ${MAX_NEO4J}s — le Graph Service peut échouer au démarrage"
    break
  fi
done
ok "Neo4j prêt"

# ── Services Python ───────────────────────────────────────────────────────────
PYTHON_SERVICES="ingestion graph ai-engine graphrag agent"

if [[ "$FORCE_REBUILD" == true ]]; then
  info "Rebuild + démarrage des microservices Python..."
  DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 \
    docker compose up -d --build --no-cache $PYTHON_SERVICES 2>&1 | tee "$LOGS_DIR/docker-build.log" || {
    warn "Certains services ont échoué — voir $LOGS_DIR/docker-build.log"
  }
else
  info "Démarrage des microservices Python (images existantes)..."
  docker compose up -d $PYTHON_SERVICES 2>&1 | tee "$LOGS_DIR/docker-start.log" || {
    warn "Certains services n'ont pas démarré — essayez ./start.sh --rebuild si c'est la première fois"
  }
fi

ok "Microservices Python démarrés (ingestion:8001 graph:8002 ai-engine:8003 graphrag:8004 agent:8005)"

# ── ASSUME Runner ─────────────────────────────────────────────────────────────
info "Démarrage du ASSUME Runner..."
docker compose up -d assume-runner >> "$LOGS_DIR/docker-start.log" 2>&1 || warn "ASSUME Runner non démarré"
ok "ASSUME Runner démarré (port 8006)"

# ── Monitoring ────────────────────────────────────────────────────────────────
info "Démarrage du monitoring (Prometheus + Grafana)..."
docker compose up -d prometheus grafana
ok "Monitoring démarré"

# ── Gateway Spring Boot ───────────────────────────────────────────────────────
GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)

if [[ "$FORCE_REBUILD" == true ]] || [[ -z "$GATEWAY_JAR" ]]; then
  info "Build du Gateway (Spring Boot)..."
  cd "$GATEWAY_DIR"
  mvn package -DskipTests -q 2>&1 || err "Build Maven du Gateway échoué"
  GATEWAY_JAR=$(ls "$GATEWAY_DIR/target/"*.jar 2>/dev/null | grep -v "sources" | head -1)
else
  info "Gateway JAR existant — skip build Maven"
fi

[[ -z "$GATEWAY_JAR" ]] && err "JAR Gateway introuvable"

# ── Lecture .env pour le Gateway ──────────────────────────────────────────────
_env() { grep "^${1}=" "$ROOT_DIR/.env" | cut -d= -f2- | tr -d '"' | head -1; }

PG_USER=$(_env POSTGRES_USER)
PG_PASS=$(_env POSTGRES_PASSWORD)
PG_DB=$(_env POSTGRES_DB)
JWT_SECRET_VAL=$(_env JWT_SECRET)
JWT_EXP=$(_env JWT_EXPIRATION_MS)
JWT_REF_EXP=$(_env JWT_REFRESH_EXPIRATION_MS)
CORS_VAL=$(_env CORS_ORIGINS)

# ── Arrêt de l'ancien Gateway ─────────────────────────────────────────────────
if [[ -f "$LOGS_DIR/gateway.pid" ]]; then
  OLD_PID=$(cat "$LOGS_DIR/gateway.pid")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$LOGS_DIR/gateway.pid"
fi
# Force-free port 8080 et attendre qu'il soit vraiment libre
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
echo -n "  Attente libération port 8080"
for _ in {1..15}; do
  lsof -ti:8080 >/dev/null 2>&1 || break
  echo -n "."
  sleep 1
done
echo ""

info "Démarrage du Gateway (java -jar)..."
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
  > "$LOGS_DIR/gateway.log" 2>&1 &

GATEWAY_PID=$!
echo $GATEWAY_PID > "$LOGS_DIR/gateway.pid"

# ── Attente Gateway ───────────────────────────────────────────────────────────
info "Attente du Gateway sur le port 8080..."
MAX_WAIT=150
WAITED=0
until curl -s http://localhost:8080/actuator/health >/dev/null 2>&1; do
  sleep 3
  WAITED=$((WAITED + 3))
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    err "Gateway non démarré après ${MAX_WAIT}s — voir $LOGS_DIR/gateway.log"
  fi
done
ok "Gateway prêt — http://localhost:8080"

# ── Frontend (Vite) ───────────────────────────────────────────────────────────
info "Démarrage du Frontend (Vite)..."
cd "$FRONTEND_DIR"

if [[ ! -d "node_modules" ]]; then
  info "Installation des dépendances npm..."
  npm install -q
fi

# Arrêt de l'ancien processus frontend
if [[ -f "$LOGS_DIR/frontend.pid" ]]; then
  OLD_PID=$(cat "$LOGS_DIR/frontend.pid")
  kill "$OLD_PID" 2>/dev/null || true
  rm -f "$LOGS_DIR/frontend.pid"
fi
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOGS_DIR/frontend.pid"

sleep 3
ok "Frontend prêt — http://localhost:5173"

# ── Résumé ────────────────────────────────────────────────────────────────────
sep
echo -e "${GREEN}   Platform CogniGrid AI — En ligne !${RESET}"
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
echo -e "  Stop        →  ${YELLOW}./stop.sh${RESET}"
echo -e "  Rebuild     →  ${YELLOW}./start.sh --rebuild${RESET}"
sep

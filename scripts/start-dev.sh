#!/bin/bash
set -e

echo "🚀 Starting CogniGrid AI — Development Environment"

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy .env.example and fill in values."
  exit 1
fi

# Start infrastructure first
echo "📦 Starting databases and stores..."
docker compose up -d postgres neo4j redis qdrant minio

echo "⏳ Waiting for databases to be ready..."
sleep 15

# Check postgres health
until docker compose exec postgres pg_isready -U cognigrid -d cognigrid > /dev/null 2>&1; do
  echo "  Waiting for PostgreSQL..."
  sleep 3
done
echo "  ✅ PostgreSQL ready"

# Check redis health
until docker compose exec redis redis-cli ping > /dev/null 2>&1; do
  echo "  Waiting for Redis..."
  sleep 3
done
echo "  ✅ Redis ready"

# Start monitoring
echo "📊 Starting monitoring..."
docker compose up -d prometheus grafana

# Start backend services
echo "🔧 Starting backend services..."
docker compose up -d gateway ingestion graph ai-engine graphrag agent

echo ""
echo "✅ CogniGrid AI is running!"
echo ""
echo "  Frontend:    http://localhost:5173  (run: cd frontend && npm run dev)"
echo ""
echo "  Backend Services:"
echo "    Gateway:    http://localhost:8080  | /swagger-ui.html"
echo "    Ingestion:  http://localhost:8001  | /docs"
echo "    Graph:      http://localhost:8002  | /docs"
echo "    AI Engine:  http://localhost:8003  | /docs"
echo "    GraphRAG:   http://localhost:8004  | /docs"
echo "    Agent:      http://localhost:8005  | /docs"
echo ""
echo "  Infrastructure:"
echo "    Neo4j:      http://localhost:7474"
echo "    MinIO:      http://localhost:9001"
echo "    Qdrant:     http://localhost:6333"
echo ""
echo "  Monitoring:"
echo "    Grafana:    http://localhost:3001  (admin/cognigrid2024)"
echo "    Prometheus: http://localhost:9090"
echo ""

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
echo "  Gateway:     http://localhost:8080"
echo "  Swagger UI:  http://localhost:8080/swagger-ui.html"
echo "  Neo4j:       http://localhost:7474"
echo "  MinIO:       http://localhost:9001"
echo "  Grafana:     http://localhost:3001"
echo "  Prometheus:  http://localhost:9090"
echo ""

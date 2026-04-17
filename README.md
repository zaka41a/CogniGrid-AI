<div align="center">

<img src="frontend/public/favicon.AI.png" alt="CogniGrid AI" width="90" height="90" />

# CogniGrid AI

**Transform unstructured documents into a living, queryable Knowledge Graph**

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.4-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.18-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

<br/>

> **CogniGrid AI** is a full-stack, production-ready Knowledge Graph platform.  
> Upload any document (PDF, Word, Excel, PowerPoint, CSV, XML), watch it become a structured graph,  
> then explore it visually, query it with natural language via **GraphRAG**, and automate reasoning with an **AI Agent**.

<br/>

[Quick Start](#quick-start) · [Architecture](#architecture) · [API Docs](#api-documentation) · [Admin Panel](#admin-panel)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Quick Start](#quick-start)
7. [Service URLs](#service-urls)
8. [API Documentation](#api-documentation)
9. [Admin Panel](#admin-panel)
10. [Environment Variables](#environment-variables)
11. [Subscription Plans](#subscription-plans)
12. [Monitoring](#monitoring)
13. [Contributing](#contributing)
14. [License](#license)

---

## Overview

CogniGrid AI ingests heterogeneous documents, extracts entities and relationships using NLP pipelines, and stores them in a **Neo4j knowledge graph**. The platform exposes this graph through:

- **Visual graph explorer**: interactive force-directed graph with filtering and path traversal
- **GraphRAG Chat**: multi-hop retrieval-augmented generation over the graph using vector + graph search
- **AI Agent**: autonomous tool-calling agent that plans, executes, and explains complex queries
- **Network Topology**: real-time anomaly detection and alert management
- **REST & Admin API**: secured by JWT with role-based access control

All services are containerised, individually scalable, and observable via Prometheus + Grafana.

---

## Key Features

| Feature | Details |
|---|---|
| **Multi-format ingestion** | PDF, Word, Excel, PowerPoint, CSV, XML, images (OCR via EasyOCR) |
| **Entity & relation extraction** | spaCy NLP + KeyBERT keyword extraction + sentence-transformers |
| **Knowledge Graph** | Neo4j 5.18 - nodes, edges, Cypher queries, full-text search |
| **Semantic vector store** | Qdrant - cosine similarity search over chunk embeddings |
| **GraphRAG** | Hybrid retrieval: graph traversal + vector similarity → LLM synthesis |
| **AI Agent** | Autonomous agent with tool-calling (search, graph, anomaly detection) |
| **Anomaly detection** | Real-time scoring, severity classification, alert lifecycle management |
| **Authentication** | JWT access + refresh tokens, BCrypt hashing, Redis session blacklisting |
| **Admin panel** | User management, subscription billing, activity log, platform settings |
| **Observability** | Prometheus metrics on every service + Grafana dashboards |
| **Object storage** | MinIO (S3-compatible) for raw file archival |
| **LLM-agnostic** | Supports Anthropic Claude, OpenAI GPT, Ollama (local), Groq |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CogniGrid AI Platform                           │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                  React / Vite Frontend  :5173                     │   │
│  │      Dashboard · Graph Explorer · GraphRAG · AI Agent · Admin     │   │
│  └────────────────────────────┬──────────────────────────────────────┘   │
│                               │  REST / JSON                             │
│  ┌────────────────────────────▼──────────────────────────────────────┐   │
│  │           Spring Boot Gateway  :8080  (Auth + Routing)            │   │
│  │        JWT Auth · CORS · Actuator · Flyway Migrations             │   │
│  └───┬─────────┬──────────┬─────────┬─────────┬──────────────────────┘   │
│      │         │          │         │         │                          │
│   ┌──▼───┐  ┌──▼───┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐                       │
│   │Inges-│  │Graph │  │  AI  │  │Graph │  │Agent │  Python / FastAPI     │
│   │tion  │  │      │  │Engine│  │ RAG  │  │      │  Microservices        │  
│   │:8001 │  │:8002 │  │:8003 │  │:8004 │  │:8005 │                       │
│   └──┬───┘  └──┬───┘  └────┬─┘  └───┬──┘  └───┬──┘                       │
│      │         │           │        │         │                          │
│  ┌───▼─────────▼───────────▼────────▼─────────▼────────────────────┐     │
│  │                      Data Layer (Docker)                        │     │
│  │   PostgreSQL:5433 · Neo4j:7687 · Qdrant:6333 · Redis:6379       │     │
│  │   MinIO:9000 · Prometheus:9090 · Grafana:3001                   │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Document Upload
      │
      ▼
  Ingestion Service
  ├── File validation & storage  →  MinIO
  ├── Text extraction (PDF / DOCX / Excel / OCR)
  ├── spaCy NER  →  entities
  ├── Relation extraction
  └── Embeddings  →  Qdrant
            │
            ▼
      Graph Service
      ├── Upsert nodes / edges  →  Neo4j
      └── Cypher schema management
                  │
          ┌───────┴────────┐
          ▼                ▼
      GraphRAG          AI Engine
      (retrieval)    (anomaly detect)
          │                │
          └───────┬────────┘
                  ▼
          AI Agent (tool-calling)
                  │
                  ▼
          LLM (Claude / GPT / Ollama)
```

---

## Tech Stack

### Backend

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Gateway** | Spring Boot + Spring Security | 3.2.4 / Java 21 | Auth, routing, JWT, Flyway |
| **Ingestion** | FastAPI + spaCy + EasyOCR | 0.111 / Python 3.11 | Document parsing & NLP |
| **Graph** | FastAPI + Neo4j driver | 0.111 / Python 3.11 | Graph CRUD & Cypher |
| **AI Engine** | FastAPI + scikit-learn | 0.111 / Python 3.11 | Anomaly detection & classification |
| **GraphRAG** | FastAPI + sentence-transformers | 0.111 / Python 3.11 | Hybrid retrieval + LLM synthesis |
| **Agent** | FastAPI + Anthropic/OpenAI SDK | 0.111 / Python 3.11 | Autonomous tool-calling agent |

### Data & Infrastructure

| Technology | Version | Role |
|---|---|---|
| **PostgreSQL** | 16-alpine | User accounts, sessions, metadata |
| **Neo4j** | 5.18-community | Knowledge graph storage & Cypher queries |
| **Qdrant** | latest | Vector embeddings & semantic similarity search |
| **Redis** | 7-alpine | Token blacklisting, session cache, task queue |
| **MinIO** | latest | S3-compatible raw file storage |
| **Ollama** | latest | Local LLM inference (optional) |
| **Prometheus** | latest | Metrics scraping from all services |
| **Grafana** | latest | Observability dashboards |

### Frontend

| Technology | Version | Role |
|---|---|---|
| **React** | 18.3 | UI framework |
| **TypeScript** | 5.6 | Type safety |
| **Vite** | 6.0 | Dev server & bundler |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Zustand** | 5.0 | Global state management |
| **React Router** | 6.28 | Client-side routing |
| **react-force-graph-2d** | 1.29 | Interactive graph visualisation |
| **Lucide React** | latest | Icon system |

---

## Project Structure

```
CogniGrid-AI/
├── backend/
│   ├── gateway/                  # Spring Boot - Auth & API gateway
│   │   ├── src/main/java/
│   │   │   └── com/cognigrid/gateway/
│   │   │       ├── auth/         # JWT, BCrypt, token service
│   │   │       ├── config/       # Security, CORS, Swagger
│   │   │       ├── controller/   # Auth & user endpoints
│   │   │       └── model/        # JPA entities
│   │   └── pom.xml
│   │
│   ├── ingestion/                # FastAPI - Document ingestion & NLP
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── routes/           # /upload, /jobs, /status
│   │   │   └── services/         # parsers, nlp, graph_writer
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── graph/                    # FastAPI - Knowledge Graph CRUD
│   ├── ai-engine/                # FastAPI - Anomaly detection & AI
│   ├── graphrag/                 # FastAPI - GraphRAG & semantic search
│   └── agent/                    # FastAPI - Autonomous AI Agent
│
├── frontend/                     # React + Vite SPA
│   ├── public/
│   │   └── favicon.AI.png
│   └── src/
│       ├── components/
│       │   ├── layout/           # Sidebar, Navbar, Layout
│       │   ├── ui/               # Avatar, Badge, Card, StatCard
│       │   └── auth/             # ProtectedRoute, AdminRoute
│       ├── pages/
│       │   ├── Home.tsx          # Marketing landing page
│       │   ├── Login.tsx         # Auth with local fallback
│       │   ├── Dashboard.tsx     # Analyst dashboard
│       │   ├── Graph.tsx         # Force-graph explorer
│       │   ├── Rag.tsx           # GraphRAG chat interface
│       │   ├── Agent.tsx         # AI Agent chat
│       │   ├── Alerts.tsx        # Alert management
│       │   ├── Ingestion.tsx     # Document upload & job tracking
│       │   └── admin/            # Full admin panel
│       │       ├── AdminLayout.tsx
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminUsers.tsx
│       │       ├── AdminPlans.tsx
│       │       ├── AdminActivity.tsx
│       │       └── AdminSettings.tsx
│       ├── store/index.ts        # Zustand global store
│       ├── lib/api.ts            # Axios API client
│       └── types/index.ts        # Shared TypeScript types
│
├── infra/
│   ├── prometheus.yml            # Scrape config for all services
│   └── grafana/                  # Dashboard provisioning
│
├── docker-compose.yml            # Full platform orchestration
├── start.sh                      # One-command platform startup
├── stop.sh                       # Graceful shutdown
└── .env.example                  # Environment template
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Docker Desktop | >= 24 |
| Java / Maven | JDK 21 / Maven 3.9+ |
| Node.js / npm | >= 20 |

### 1. Clone & configure

```bash
git clone https://github.com/your-username/CogniGrid-AI.git
cd CogniGrid-AI

# Copy and fill in your API keys
cp .env.example .env
```

Edit `.env` and add at minimum one LLM provider key:

```env
# Choose one:
ANTHROPIC_API_KEY=sk-ant-...          # Claude (recommended)
OPENAI_API_KEY=sk-...                 # OpenAI GPT
# Or leave both empty to use Ollama locally
DEFAULT_LLM_PROVIDER=anthropic
DEFAULT_LLM_MODEL=claude-haiku-4-5-20251001
```

### 2. Start the platform

```bash
chmod +x start.sh
./start.sh
```

The script will:
1. Start all Docker services (PostgreSQL, Neo4j, Redis, Qdrant, MinIO)
2. Build and start the 5 Python microservices in Docker
3. Build and launch the Spring Boot gateway (`java -jar`)
4. Start the Vite dev server

> **First run**: Docker images for Python services download ML models (~500 MB).  
> Allow 5 to 15 minutes depending on network speed.

### 3. Open the app

```
http://localhost:5173
```

**Default accounts:**

| Email | Password | Role |
|---|---|---|
| `admin@cognigrid.ai` | `CogniGrid@Admin2024` | Super Admin |
| `zakaria@cognigrid.ai` | `zakaria2024` | Analyst |
| `demo@cognigrid.ai` | `demo2024` | Viewer |

> Admin users are automatically redirected to `/admin` after login.

### 4. Stop everything

```bash
./stop.sh
```

---

## Service URLs

| Service | URL | Description |
|---|---|---|
| **Frontend** | http://localhost:5173 | React SPA |
| **Admin Panel** | http://localhost:5173/admin | Admin dashboard |
| **Gateway API** | http://localhost:8080 | Spring Boot REST gateway |
| **Swagger UI** | http://localhost:8080/swagger-ui.html | Gateway API docs |
| **Ingestion API** | http://localhost:8001/docs | Document ingestion (FastAPI) |
| **Graph API** | http://localhost:8002/docs | Knowledge graph CRUD (FastAPI) |
| **AI Engine** | http://localhost:8003/docs | Anomaly detection (FastAPI) |
| **GraphRAG** | http://localhost:8004/docs | GraphRAG & chat (FastAPI) |
| **AI Agent** | http://localhost:8005/docs | Autonomous agent (FastAPI) |
| **Neo4j Browser** | http://localhost:7474 | Graph database UI |
| **MinIO Console** | http://localhost:9001 | Object storage UI |
| **Grafana** | http://localhost:3001 | Observability dashboards |
| **Prometheus** | http://localhost:9090 | Metrics explorer |

---

## API Documentation

### Authentication (Gateway `:8080`)

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/users/me
```

All protected endpoints require:
```http
Authorization: Bearer <access_token>
```

### Ingestion Service (`:8001`)

```http
POST   /upload              # Upload a document (multipart/form-data)
GET    /jobs                # List ingestion jobs
GET    /jobs/{id}           # Get job status & result
DELETE /jobs/{id}           # Cancel or delete a job
GET    /health              # Service health
GET    /metrics             # Prometheus metrics
```

### Graph Service (`:8002`)

```http
GET  /graph/nodes           # List all graph nodes
GET  /graph/edges           # List all edges
POST /graph/search          # Full-text node search
GET  /graph/node/{id}       # Node detail + neighbours
POST /cypher                # Execute raw Cypher query
GET  /stats                 # Graph statistics
```

### GraphRAG Service (`:8004`)

```http
POST /chat                  # GraphRAG conversation turn
POST /search                # Hybrid semantic + graph search
GET  /history/{session_id}  # Conversation history
```

**Example chat request:**
```json
{
  "question": "What are the main risks connected to the SCADA system?",
  "session_id": "abc123",
  "top_k": 5,
  "use_graph": true
}
```

### AI Agent (`:8005`)

```http
POST /agent/run             # Start an agent task
GET  /agent/tasks           # List running tasks
GET  /agent/tasks/{id}      # Task result & reasoning steps
```

---

## Admin Panel

Access at `http://localhost:5173/admin`. Log in with admin credentials, or use the main login at `/login` (admin users are auto-redirected).

| Section | Path | Capabilities |
|---|---|---|
| **Overview** | `/admin` | KPIs, revenue chart, plan distribution, activity feed, system health |
| **Users** | `/admin/users` | Search, filter, view detail, change plan, suspend/reactivate, delete |
| **Subscriptions** | `/admin/plans` | Per-plan metrics, MRR, adoption rate, revenue history chart |
| **Activity Log** | `/admin/activity` | All platform events with type, timestamp, IP address |
| **Settings** | `/admin/settings` | Platform name, LLM provider, 2FA policy, session TTL, notifications, backups |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Databases
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=cognigrid
POSTGRES_USER=cognigrid
POSTGRES_PASSWORD=<strong-password>

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<strong-password>

REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333

MINIO_ROOT_USER=cognigrid_admin
MINIO_ROOT_PASSWORD=<strong-password>
MINIO_URL=http://localhost:9000
MINIO_BUCKET=cognigrid-files

# Authentication
JWT_SECRET=<min-64-char-random-string>
JWT_EXPIRATION_MS=86400000          # 24 hours
JWT_REFRESH_EXPIRATION_MS=604800000 # 7 days

# LLM Providers
DEFAULT_LLM_PROVIDER=anthropic      # anthropic | openai | ollama | groq
DEFAULT_LLM_MODEL=claude-haiku-4-5-20251001

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Service Ports
GATEWAY_PORT=8080
INGESTION_PORT=8001
GRAPH_PORT=8002
AI_ENGINE_PORT=8003
GRAPHRAG_PORT=8004
AGENT_PORT=8005

# CORS
CORS_ORIGINS=http://localhost:5173
```

> **Docker networking**: The `.env` file uses `localhost` for local development.  
> `docker-compose.yml` overrides hostnames to internal Docker service names  
> (`neo4j`, `redis`, `qdrant`, etc.) for container-to-container communication.

---

## Subscription Plans

| Plan | Price | Uploads/mo | Features |
|---|---|---|---|
| **Free** | €0 | 7 | GraphRAG Chat, Knowledge Graph, Community support |
| **Pro** | €11.99/mo | 100 | All Free + AI Agent, Priority support, API access |
| **Ultra** | €24.99/mo | Unlimited | All Pro + Custom models, Dedicated support, SLA 99.9% |

---

## Monitoring

Prometheus scrapes metrics from all 6 services every 15 seconds.

**Grafana**: `http://localhost:3001`

Pre-built dashboards cover:
- Request rate & latency per microservice
- Graph ingestion throughput
- LLM call latency & token usage
- Alert volume & severity distribution
- Active user sessions

Every service exposes `/health` and `/metrics`.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feat/your-feature`
5. Open a Pull Request

### Coding conventions

- **Gateway**: Spring Boot 3 conventions, Lombok, constructor injection
- **Python services**: PEP 8, `pydantic-settings` for config, async FastAPI handlers
- **Frontend**: functional components, Zustand for state, Tailwind utility classes only (no inline styles)
- **Commits**: follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built with ❤️ by **zaka41a**

<sub>Spring Boot · FastAPI · React · Neo4j · Qdrant · Redis · MinIO · Docker</sub>

</div>

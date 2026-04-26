<!--
  ┌────────────────────────────────────────────────────────────────────┐
  │  Copyright © 2026 Zakaria Sabiri.                                  │
  │  Licensed under the PolyForm Noncommercial License 1.0.0.          │
  │  Commercial use is PROHIBITED without a separate written license.  │
  │  See LICENSE file for full terms.                                  │
  └────────────────────────────────────────────────────────────────────┘
-->

<div align="center">

<img src="frontend/public/favicon.AI.png" alt="CogniGrid AI" width="90" height="90" />

# CogniGrid AI

**Full-stack Knowledge Graph platform from raw documents to intelligent, queryable graph intelligence**

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.4-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.18-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License: PolyForm NC](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-orange?style=flat-square)](LICENSE)
[![Source-Available](https://img.shields.io/badge/Source-Available%20%28non--commercial%29-red?style=flat-square)](LICENSE)

<br/>

> **CogniGrid AI** is a production-ready Knowledge Graph platform built for AI-powered knowledge management.
> Upload any document (PDF, Word, Excel, PowerPoint, CSV, XML), watch it become a structured graph,
> then explore it visually, query it with natural language via **GraphRAG**, automate reasoning with an **AI Agent**,
> and run real **ASSUME electricity market simulations** powered by the knowledge graph.

<br/>

[Quick Start](#quick-start) · [Architecture](#architecture) · [ASSUME Workspace](#assume-workspace) · [API Docs](#api-documentation) · [Admin Panel](#admin-panel)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [ASSUME Workspace](#assume-workspace)
4. [Architecture](#architecture)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Quick Start](#quick-start)
8. [Service URLs](#service-urls)
9. [API Documentation](#api-documentation)
10. [Admin Panel](#admin-panel)
11. [Environment Variables](#environment-variables)
12. [Monitoring](#monitoring)
13. [License](#license)

---

## Overview

CogniGrid AI ingests heterogeneous documents, extracts entities and relationships using NLP pipelines, and stores them in a **Neo4j knowledge graph**. The platform exposes this graph through:

- **Visual graph explorer**: interactive force-directed graph with filtering and path traversal
- **GraphRAG Chat**: multi-hop retrieval-augmented generation over the graph using vector and graph search
- **AI Agent**: autonomous tool-calling agent that plans, executes, and explains complex queries
- **ASSUME Workspace**: specialized module for electricity market research with GraphRAG-powered scenario design and real simulation execution
- **Network Topology**: real-time anomaly detection and alert management
- **REST and Admin API**: secured by JWT with role-based access control

All services are containerised, individually scalable, and observable via Prometheus and Grafana.

---

## Key Features

| Feature | Details |
|---|---|
| **Multi-format ingestion** | PDF, Word, Excel, PowerPoint, CSV, XML, images via OCR |
| **Entity and relation extraction** | spaCy NER + KeyBERT keyword extraction + sentence-transformers |
| **Knowledge Graph** | Neo4j 5.18 with nodes, edges, Cypher queries, full-text search |
| **Semantic vector store** | Qdrant with cosine similarity search over chunk embeddings |
| **GraphRAG** | Hybrid retrieval: graph traversal + vector similarity fed to LLM |
| **AI Agent** | Autonomous agent with tool-calling (search, graph, anomaly detection) |
| **ASSUME Workspace** | Scenario Advisor, Scenario Generator, Outcome Predictor, Simulation Runner, Scenario Comparison |
| **Simulation execution** | Real ASSUME framework runs from YAML, results pushed back to the knowledge graph |
| **Anomaly detection** | Real-time scoring, severity classification, alert lifecycle management |
| **Authentication** | JWT access + refresh tokens, BCrypt hashing, Redis session blacklisting |
| **Admin panel** | User management, activity log, system health, platform settings |
| **Observability** | Prometheus metrics on every service + Grafana dashboards |
| **Object storage** | MinIO S3-compatible for raw file archival |
| **LLM-agnostic** | Supports Anthropic Claude, OpenAI GPT, Ollama (local), Groq |

---

## ASSUME Workspace

The ASSUME Workspace is a dedicated research environment for electricity market simulation built on top of the CogniGrid knowledge graph.

### What is ASSUME?

ASSUME (Agent-based Simulation of Sustainable Energy Markets) is an open-source Python framework for simulating electricity market mechanisms with autonomous bidding agents. The CogniGrid ASSUME Workspace ingests the complete ASSUME documentation, source code, and example configurations into Neo4j and Qdrant, enabling AI-powered scenario design and real simulation execution.

### Tabs and Features

| Tab | Description |
|---|---|
| **Overview** | Knowledge graph stats, project roadmap, quick access to all tools |
| **Scenario Advisor** | GraphRAG-powered chat using Groq Llama 3.3 70B and the ASSUME knowledge graph |
| **Scenario Generator** | Natural language to executable YAML via agent tools and 6 ready-made templates |
| **Simulation Runner** | Execute real ASSUME simulations, stream live logs, visualise clearing price curves |
| **Compare** | Side-by-side comparison of two completed simulation runs with metrics diff |
| **Knowledge Map** | Explore entity distribution, search the graph, browse ASSUME concepts |
| **Import Docs** | Upload additional papers, scripts or YAML configs to expand the knowledge graph |

### How the graph grows

Every completed simulation run with "Push to Knowledge Graph" enabled sends a structured results document to the ingestion service. The clearing prices, dispatch volumes, and scenario metadata are extracted and stored as new nodes in Neo4j. Each run makes the knowledge graph richer and improves future predictions.

### Starting the simulation backend

```bash
docker compose up --build agent assume-runner
```

The `agent` service activates the `/api/agent/assume/generate` and `/api/agent/assume/predict` endpoints.
The `assume-runner` service at port 8006 executes real `python -m assume` subprocesses and streams stdout line by line over Server-Sent Events.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CogniGrid AI Platform                               │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                  React / Vite Frontend  :5173                         │   │
│  │   Dashboard · Graph · GraphRAG · AI Agent · ASSUME Workspace · Admin  │   │
│  └────────────────────────────┬──────────────────────────────────────────┘   │
│                               │  REST / JSON                                 │
│  ┌────────────────────────────▼──────────────────────────────────────────┐   │
│  │           Spring Boot Gateway  :8080  (Auth + Routing)                │   │
│  │        JWT Auth · CORS · Actuator · Flyway Migrations                 │   │
│  └───┬─────────┬──────────┬─────────┬─────────┬──────────┬───────────────┘   │
│      │         │          │         │         │          │                   │
│   ┌──▼───┐  ┌──▼───┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌────▼─────┐             │
│   │Inges-│  │Graph │  │  AI  │  │Graph │  │Agent │  │  ASSUME  │             │
│   │tion  │  │      │  │Engine│  │ RAG  │  │ASSUME│  │  Runner  │             │
│   │:8001 │  │:8002 │  │:8003 │  │:8004 │  │:8005 │  │  :8006   │             │
│   └──┬───┘  └──┬───┘  └────┬─┘  └───┬──┘  └───┬──┘  └─────┬────┘             │
│      │         │           │        │         │           │                  │
│  ┌───▼─────────▼───────────▼────────▼─────────▼───────────▼────────────┐     │
│  │                      Data Layer (Docker)                            │     │
│  │   PostgreSQL:5433 · Neo4j:7687 · Qdrant:6333 · Redis:6379           │     │
│  │   MinIO:9000 · Prometheus:9090 · Grafana:3001                       │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Document Upload
      │
      ▼
  Ingestion Service
  ├── File validation and storage  →  MinIO
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
          ├── ASSUME Scenario Generator
          ├── ASSUME Outcome Predictor
          └── LLM (Claude / GPT / Groq / Ollama)

ASSUME Runner  ← YAML config
      ├── python -m assume (real subprocess)
      ├── Stream logs via SSE
      ├── Parse market_meta.csv + market_dispatch.csv
      └── Push results to Ingestion Service → Neo4j grows
```

---

## Tech Stack

### Backend

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Gateway** | Spring Boot + Spring Security | 3.2.4 / Java 21 | Auth, routing, JWT, Flyway |
| **Ingestion** | FastAPI + spaCy + EasyOCR | 0.111 / Python 3.11 | Document parsing and NLP |
| **Graph** | FastAPI + Neo4j driver | 0.111 / Python 3.11 | Graph CRUD and Cypher |
| **AI Engine** | FastAPI + scikit-learn | 0.111 / Python 3.11 | Anomaly detection and classification |
| **GraphRAG** | FastAPI + sentence-transformers | 0.111 / Python 3.11 | Hybrid retrieval + LLM synthesis |
| **Agent** | FastAPI + Anthropic/OpenAI SDK | 0.111 / Python 3.11 | Autonomous tool-calling agent + ASSUME tools |
| **ASSUME Runner** | FastAPI + assume-framework | 0.4.3 / Python 3.11 | Real simulation execution + SSE log streaming |

### Data and Infrastructure

| Technology | Version | Role |
|---|---|---|
| **PostgreSQL** | 16-alpine | User accounts, sessions, metadata |
| **Neo4j** | 5.18-community | Knowledge graph storage and Cypher queries |
| **Qdrant** | latest | Vector embeddings and semantic similarity search |
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
| **Vite** | 6.0 | Dev server and bundler |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Zustand** | 5.0 | Global state management |
| **React Router** | 6.28 | Client-side routing |
| **react-force-graph-2d** | 1.29 | Interactive graph visualisation |
| **recharts** | 2.x | Price curve and dispatch charts in ASSUME Workspace |
| **Lucide React** | latest | Icon system |

---

## Project Structure

```
CogniGrid-AI/
├── backend/
│   ├── gateway/                  # Spring Boot - Auth and API gateway
│   │   ├── src/main/java/
│   │   │   └── com/cognigrid/gateway/
│   │   │       ├── auth/         # JWT, BCrypt, token service
│   │   │       ├── config/       # Security, CORS, Swagger
│   │   │       ├── controller/   # Auth and user endpoints
│   │   │       └── model/        # JPA entities
│   │   └── pom.xml
│   │
│   ├── ingestion/                # FastAPI - Document ingestion and NLP
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── routes/           # /upload, /jobs, /status
│   │   │   └── services/         # parsers, nlp, graph_writer
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── graph/                    # FastAPI - Knowledge Graph CRUD
│   ├── ai-engine/                # FastAPI - Anomaly detection and AI
│   ├── graphrag/                 # FastAPI - GraphRAG and semantic search
│   ├── agent/                    # FastAPI - Autonomous AI Agent + ASSUME tools
│   │   └── app/
│   │       ├── core/tools.py     # generate_assume_scenario, predict_assume_outcome
│   │       └── api/routes/
│   │           └── agent.py      # /assume/generate, /assume/predict endpoints
│   │
│   └── assume-runner/            # FastAPI - ASSUME simulation executor
│       ├── app/
│       │   ├── main.py           # FastAPI app, CORS, /api/runner prefix
│       │   ├── config.py         # graph_service_url, ingestion_service_url, runs_dir
│       │   ├── models/schemas.py # RunStatus, RunRequest, RunInfo
│       │   ├── core/runner.py    # subprocess executor, CSV parser, graph push
│       │   └── api/routes/
│       │       └── runner.py     # POST /runs, GET /runs, GET /runs/{id}/logs SSE
│       └── Dockerfile
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
│       │   ├── Ingestion.tsx     # Document upload and job tracking
│       │   ├── assume/
│       │   │   └── AssumeWorkspace.tsx   # 7-tab ASSUME research environment
│       │   └── admin/            # Full admin panel
│       │       ├── AdminLayout.tsx
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminUsers.tsx
│       │       ├── AdminPlans.tsx
│       │       ├── AdminActivity.tsx
│       │       └── AdminSettings.tsx
│       ├── store/index.ts        # Zustand global store
│       ├── lib/api.ts            # Axios API client (all 6 services)
│       └── types/index.ts        # Shared TypeScript types
│
├── docker-compose.yml            # Full platform orchestration (14 services)
├── start.sh                      # One-command platform startup
└── .env.example                  # Environment template
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Docker Desktop | >= 24 |
| Java and Maven | JDK 21 / Maven 3.9+ |
| Node.js and npm | >= 20 |

### 1. Clone and configure

```bash
git clone https://github.com/your-username/CogniGrid-AI.git
cd CogniGrid-AI

cp .env.example .env
```

Edit `.env` and add at minimum one LLM provider key:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
DEFAULT_LLM_PROVIDER=groq
DEFAULT_LLM_MODEL=llama-3.3-70b-versatile
```

### 2. Start the platform

```bash
chmod +x start.sh
./start.sh
```

The script will:
1. Start all Docker services (PostgreSQL, Neo4j, Redis, Qdrant, MinIO, Ollama)
2. Build and start the 6 Python microservices in Docker
3. Build and launch the Spring Boot gateway
4. Start the Vite dev server

> **First run**: Docker images for Python services download ML models (around 500 MB).
> Allow 5 to 15 minutes depending on network speed.

### 3. Open the app

```
http://localhost:5173
```

Register an account on first launch. The first registered user can be promoted to admin directly in the database or via the gateway's admin API.

### 4. Start the ASSUME simulation backend

```bash
docker compose up --build agent assume-runner
```

This activates the Scenario Generator, Outcome Predictor, and Simulation Runner tabs inside the ASSUME Workspace.

---

## Service URLs

| Service | URL | Description |
|---|---|---|
| **Frontend** | http://localhost:5173 | React SPA |
| **ASSUME Workspace** | http://localhost:5173 (sidebar) | 7-tab ASSUME research environment |
| **Admin Panel** | http://localhost:5173/admin | Admin dashboard |
| **Gateway API** | http://localhost:8080 | Spring Boot REST gateway |
| **Swagger UI** | http://localhost:8080/swagger-ui.html | Gateway API docs |
| **Ingestion API** | http://localhost:8001/docs | Document ingestion (FastAPI) |
| **Graph API** | http://localhost:8002/docs | Knowledge graph CRUD (FastAPI) |
| **AI Engine** | http://localhost:8003/docs | Anomaly detection (FastAPI) |
| **GraphRAG** | http://localhost:8004/docs | GraphRAG and chat (FastAPI) |
| **AI Agent** | http://localhost:8005/docs | Autonomous agent + ASSUME tools (FastAPI) |
| **ASSUME Runner** | http://localhost:8006/docs | Simulation executor + SSE logs (FastAPI) |
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
POST   /api/ingestion/upload     # Upload a document (multipart/form-data)
GET    /api/ingestion/jobs       # List ingestion jobs
GET    /api/ingestion/jobs/{id}  # Get job status and result
DELETE /api/ingestion/jobs/{id}  # Cancel or delete a job
GET    /health                   # Service health
GET    /metrics                  # Prometheus metrics
```

### Graph Service (`:8002`)

```http
GET    /api/graph/stats                   # Graph statistics (nodes, edges, labels)
GET    /api/graph/search                  # Full-text node search
GET    /api/graph/documents               # List ingested documents
GET    /api/graph/nodes/{id}/neighbors    # Node neighbours
DELETE /api/graph/documents/{id}          # Delete a document from graph
DELETE /api/graph/clear                   # Clear all graph data
```

### GraphRAG Service (`:8004`)

```http
POST /api/rag/chat     # GraphRAG conversation turn
POST /api/rag/search   # Hybrid semantic + graph search
```

**Example chat request:**
```json
{
  "query": "What are the main risks connected to the SCADA system?",
  "llm_provider": "groq",
  "llm_model": "llama-3.3-70b-versatile",
  "use_graph_context": true,
  "history": []
}
```

### AI Agent (`:8005`)

```http
POST /api/agent/chat              # Autonomous agent conversation
GET  /api/agent/tools             # List available tools
POST /api/agent/assume/generate   # Generate ASSUME scenario YAML from description
POST /api/agent/assume/predict    # Predict simulation outcomes before running
```

**Example ASSUME scenario generation:**
```json
{
  "description": "Day-ahead market with 2 coal plants and a wind farm",
  "duration_hours": 24,
  "market_type": "day_ahead"
}
```

### ASSUME Runner (`:8006`)

```http
POST   /api/runner/runs             # Start a simulation run
GET    /api/runner/runs             # List all runs
GET    /api/runner/runs/{id}        # Get run status and results
DELETE /api/runner/runs/{id}        # Cancel a running simulation
GET    /api/runner/runs/{id}/logs   # Stream live logs via Server-Sent Events
GET    /health                      # Service health
```

**Example simulation start:**
```json
{
  "yaml_config": "scenario_name: my_scenario\n...",
  "scenario_name": "my_scenario",
  "description": "Optional description",
  "push_to_graph": true
}
```

---

## Admin Panel

Access at `http://localhost:5173/admin`. Log in with admin credentials (admin users are auto-redirected from `/login`).

| Section | Path | Capabilities |
|---|---|---|
| **Overview** | `/admin` | User KPIs, ingestion stats, activity feed, system health per service |
| **Users** | `/admin/users` | Search, filter, view detail, change role, suspend/reactivate, delete |
| **Activity Log** | `/admin/activity` | All platform events with type, timestamp, IP address |
| **Settings** | `/admin/settings` | Platform name, LLM provider, 2FA policy, session TTL, notifications, backups |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Databases
POSTGRES_DB=cognigrid
POSTGRES_USER=cognigrid
POSTGRES_PASSWORD=<strong-password>

NEO4J_AUTH=neo4j/<strong-password>
NEO4J_USER=neo4j
NEO4J_PASSWORD=<strong-password>

REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333

MINIO_ROOT_USER=cognigrid_admin
MINIO_ROOT_PASSWORD=<strong-password>
MINIO_BUCKET=cognigrid-files

# Authentication
JWT_SECRET=<min-64-char-random-string>
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_EXPIRATION_MS=604800000

# LLM Providers
DEFAULT_LLM_PROVIDER=groq
DEFAULT_LLM_MODEL=llama-3.3-70b-versatile

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
```

---

## Monitoring

Prometheus scrapes metrics from all services every 15 seconds.

**Grafana**: `http://localhost:3001`

Pre-built dashboards cover:
- Request rate and latency per microservice
- Graph ingestion throughput
- LLM call latency and token usage
- Alert volume and severity distribution
- Active user sessions

Every service exposes `/health` and `/metrics`.

---

## License

CogniGrid AI is **source-available** under the [**PolyForm Noncommercial License 1.0.0**](LICENSE).

| You **may** | You **may not** without a separate commercial license |
|---|---|
| View, read, study the source | Sell or host CogniGrid AI as a paid service |
| Run it locally for personal study, research, or experimentation | Embed it (or a non-trivial part of it) in a commercial product |
| Modify it for non-commercial purposes | Use it to deliver paid consulting / SaaS / integration |
| Use it in non-profit, academic, or public-interest organizations | Re-publish under another license (including MIT/Apache/GPL) |

**Copyright © 2026 Zakaria Sabiri.** All rights reserved beyond those granted by the license.
For commercial licensing, contact **zaksab98@gmail.com**.

> ⚠️ This is **NOT** an Open Source license under the OSI definition. Anyone who clones, forks,
> or runs this repository implicitly accepts the terms in [`LICENSE`](LICENSE).

---

## Default Admin Account

After the first start, a default admin account is auto-seeded by the gateway:

| Email | Password | Role |
|---|---|---|
| `admin@gmail.com` | `admin4321` | `ADMIN` |

**Change it immediately** the Admin Console (sidebar → *Administration → Admin Console*) lets you reset the password, suspend other users, or change roles. The password is only re-seeded if the account does not already exist (idempotent across rebuilds).

---

<div align="center">

Built by **Zaka41a**

</div>

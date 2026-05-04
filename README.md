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

**A full-stack Knowledge Graph + GraphRAG platform with native ASSUME electricity-market simulation.**

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.4-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.18-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License: PolyForm NC](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-orange?style=flat-square)](LICENSE)

[**Quick Start**](#quick-start) · [Architecture](docs/architecture.md) · [API Reference](docs/api.md) · [Admin Guide](docs/admin.md)

</div>

---

## What it does

Upload any document (PDF, Word, Excel, PowerPoint, CSV, XML, image) → CogniGrid extracts entities and relationships, builds a per-user **Neo4j knowledge graph**, indexes chunks in **Qdrant**, and exposes them through:

- **Graph Explorer** interactive force-directed visualisation
- **GraphRAG Chat** multi-hop retrieval-augmented generation with cited sources
- **AI Agent** ReAct tool-calling agent over your graph
- **ASSUME Workspace** natural-language → YAML scenario generator + real `assume run` execution with live SSE log streaming
- **Admin Console** user management, password reset, role change, activity log

Every layer enforces **per-user isolation** (Neo4j `user_id`, Qdrant payload filter, Postgres FK) so accounts cannot see each other's data.

## Architecture (one-screen)

| Layer | Service | Port |
|---|---|---|
| **Edge** | Spring Boot Gateway (Auth + JWT + Admin + Rate-limit) | `8080` |
| **App** | Ingestion (FastAPI + spaCy + EasyOCR) | `8001` |
|        | Graph (FastAPI + Neo4j) | `8002` |
|        | AI Engine (FastAPI + scikit-learn) | `8003` |
|        | GraphRAG (FastAPI + sentence-transformers + LLM) | `8004` |
|        | AI Agent (FastAPI + ReAct + ASSUME tools) | `8005` |
|        | ASSUME Runner (FastAPI + assume-framework subprocess) | `8006` |
| **Data** | PostgreSQL · Neo4j · Qdrant · Redis · MinIO | various |
| **Ops** | Prometheus · Grafana | `9090` / `3001` |
| **UI** | React 18 + Vite + Tailwind | `5173` |

→ Full diagram and data flow in [`docs/architecture.md`](docs/architecture.md).

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Docker Desktop | ≥ 24 |
| Java + Maven | JDK 21 / Maven 3.9+ |
| Node.js + npm | ≥ 20 |

### 1. Configure

```bash
git clone https://github.com/your-username/CogniGrid-AI.git
cd CogniGrid-AI
cp .env.example .env
```

Edit `.env` and add at minimum one LLM provider key:

```env
GROQ_API_KEY=gsk_... 
DEFAULT_LLM_PROVIDER=groq
DEFAULT_LLM_MODEL=llama-3.3-70b-versatile
JWT_SECRET=<min-32-char-random-string>
NEO4J_PASSWORD=<strong-password>
POSTGRES_PASSWORD=<strong-password>
```

### 2. Start everything

```bash
chmod +x start.sh
./start.sh                 # fast start (existing images)
./start.sh --rebuild       # full rebuild (first run, ~5–15 min)
```

### 3. Open the app

```
http://localhost:5173
```

Sign in with the default admin account:

| Email | Password |
|---|---|
| `admin@gmail.com` | `admin4321` |

→ **Change this password immediately** via *Admin Console → Reset password*.
→ Platform shutdown: `./stop.sh`.

## Default URLs

| | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Gateway / Swagger | http://localhost:8080/swagger-ui.html |
| Service docs (FastAPI) | http://localhost:8001..8006/docs |
| Neo4j Browser | http://localhost:7474 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| MinIO Console | http://localhost:9001 |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — diagrams, data flow, isolation model, GraphRAG and Agent pipelines, full tech stack
- [`docs/api.md`](docs/api.md) — endpoint reference for every service
- [`docs/admin.md`](docs/admin.md) — admin console capabilities and audit log

## Testing locally

```bash
# Gateway (Java)
cd backend/gateway && mvn test

# Frontend (TypeScript type-check)
cd frontend && npx tsc --noEmit

# Each Python service (smoke tests, requires service running)
cd backend/<service> && pytest -q
```

CI runs all of the above on every push see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## License

CogniGrid AI is **source-available** under the [**PolyForm Noncommercial License 1.0.0**](LICENSE).

| You **may** | You **may NOT** without a separate commercial license |
|---|---|
| View, study, modify the source | Sell or host CogniGrid AI as a paid service |
| Run it locally for personal study, research, experimentation | Embed it (or any non-trivial part) into a commercial product |
| Use it in non-profit / academic / public-interest organizations | Use it for paid consulting, SaaS, or integration services |
|   | Re-publish under another license (including MIT / Apache / GPL) |

**Copyright © 2026 Zakaria Sabiri.** All rights reserved beyond those granted by the license.
For commercial licensing, contact **zaksab98@gmail.com**.

> ⚠️ This is **NOT** an OSI-approved Open Source license. Cloning, forking or running this repository implies acceptance of [`LICENSE`](LICENSE).

---

<div align="center">

Built by **Zaka41a**

</div>

<!--
  ┌────────────────────────────────────────────────────────────────────┐
  │  Copyright © 2026 Zakaria Sabiri.                                  │
  │  Licensed under the GNU Affero General Public License v3.0.        │
  │  This program is free software: see the LICENSE file for terms.    │
  │  SPDX-License-Identifier: AGPL-3.0-or-later                        │
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
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue?style=flat-square)](LICENSE)

[**Quick Start**](#quick-start) · [Architecture](docs/architecture.md) · [API Reference](docs/api.md) 

</div>

---

## What it does

Upload any document (PDF, Word, Excel, PowerPoint, CSV, XML, image) → CogniGrid extracts entities and relationships, builds a per-user **Neo4j knowledge graph**, indexes chunks in **Qdrant**, and exposes them through:

- **Graph Explorer** interactive force-directed visualisation
- **GraphRAG Chat** multi-hop retrieval-augmented generation with cited sources
- **AI Agent** ReAct tool-calling agent over your graph
- **ASSUME Workspace** natural-language → YAML scenario generator + real `assume run` execution with live SSE log streaming

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
./start.sh --rebuild       # full rebuild (first run, ~5-15 min)
```

### 3. Open the app

```
http://localhost:5173
```

Sign in with the default admin account:

| Email | Password |
|---|----------|
| `admin@gmail.com` | `******` |

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

- [`docs/architecture.md`](docs/architecture.md) - diagrams, data flow, isolation model, GraphRAG and Agent pipelines, full tech stack
- [`docs/api.md`](docs/api.md) - endpoint reference for every service
- 
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

CogniGrid AI is **free and open-source software** licensed under the
[**GNU Affero General Public License v3.0**](LICENSE) (`AGPL-3.0-or-later`).

| You **may** | You **must** |
|---|---|
| Use, study, modify and run the software for any purpose, including commercially | Keep the same AGPL-3.0 license on any distributed copy or derivative |
| Distribute copies and modified versions | Disclose your complete corresponding source code |
| Host it as a network service | Make the source available to **users interacting with it over a network** |
| Build on top of it | Preserve copyright and license notices |

The AGPL-3.0 "network use" clause (§13) means that if you run a modified
CogniGrid AI as a hosted service, you must offer its source code to your users.

**Copyright © 2026 Zakaria Sabiri.**
This program is distributed WITHOUT ANY WARRANTY; see the [`LICENSE`](LICENSE) file for full terms.

---

<div align="center">

Built by **Zaka41a**

</div>

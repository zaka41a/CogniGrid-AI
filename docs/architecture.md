# CogniGrid AI — Architecture

## High-level diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CogniGrid AI Platform                               │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                  React / Vite Frontend  :5173                         │   │
│  │   Dashboard · Graph · GraphRAG · AI Agent · ASSUME Workspace · Admin  │   │
│  └────────────────────────────┬──────────────────────────────────────────┘   │
│                               │  REST / JSON (JWT in Authorization header)   │
│  ┌────────────────────────────▼──────────────────────────────────────────┐   │
│  │           Spring Boot Gateway  :8080  (Auth + Admin + Routing)        │   │
│  │        JWT Auth · CORS · Actuator · Flyway · Bucket4j Rate Limiter    │   │
│  └───┬─────────┬──────────┬─────────┬─────────┬──────────────────────────┘   │
│      │         │          │         │         │                              │
│   ┌──▼───┐  ┌──▼───┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌──────────┐             │
│   │Inges-│  │Graph │  │  AI  │  │Graph │  │Agent │  │  ASSUME  │             │
│   │tion  │  │      │  │Engine│  │ RAG  │  │+ASSUME│  │  Runner  │             │
│   │:8001 │  │:8002 │  │:8003 │  │:8004 │  │:8005 │  │  :8006   │             │
│   └──┬───┘  └──┬───┘  └────┬─┘  └───┬──┘  └───┬──┘  └────┬─────┘             │
│      │         │           │        │         │           │                  │
│  ┌───▼─────────▼───────────▼────────▼─────────▼───────────▼────────────┐     │
│  │                      Data Layer (Docker)                            │     │
│  │   PostgreSQL:5433 · Neo4j:7687 · Qdrant:6333 · Redis:6379           │     │
│  │   MinIO:9000 · Prometheus:9090 · Grafana:3001                       │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data flow on document upload

```
Document Upload (multipart POST → :8001)
      │
      ▼
  Ingestion Service
  ├── JWT verify → user_id
  ├── File validation + storage (MinIO)
  ├── Text extraction (PDF / DOCX / Excel / OCR)
  ├── spaCy NER → entities
  ├── Relation extraction (CIM ref-id / regex)
  ├── Embeddings (sentence-transformers/all-MiniLM-L6-v2, 384-d)
  └── ───────────────────────────────────────┐
                                              │
            ┌─────────────────────────────────┴─────────────────────────────┐
            ▼                                                               ▼
      Graph Service (Neo4j)                                       Qdrant Vector Store
      ├── MERGE Document {user_id}                                ├── Upsert points
      ├── MERGE Entity nodes                                      │   • id = uuid5(job_id, chunk_idx)
      ├── MENTIONS / RELATED_TO edges                             │   • payload.user_id (filter)
      └── Per-user scoping                                        └── Per-user scoping
```

## Per-user data isolation

Every layer enforces `user_id` from the JWT `sub` claim:

| Layer | How it scopes |
|---|---|
| **Ingestion (Postgres)** | `ingestion_jobs.user_id` indexed FK |
| **Graph (Neo4j)** | Every `Document` node has `user_id` property; queries filter `WHERE d.user_id = $user_id` |
| **Vectors (Qdrant)** | Every point has `payload.user_id` keyword index; search uses `Filter(must=[user_id])` |
| **Storage (MinIO)** | Object key prefix `{user_id}/` |
| **Auth (Postgres)** | `users.email` is the `sub` claim source |

## GraphRAG retrieval pipeline

```
User query
   │
   ▼
1. Semantic search (Qdrant)              → top-K chunks (filtered by user_id, score ≥ 0.20)
2. Graph context (Neo4j)                 → keyword-matched entities + N-hop neighbors
3. Build prompt with size guards         → max 1500 chars/source, 12K total
4. LLM call (Groq / OpenAI / Anthropic)  → answer + cited sources [N]
5. Empty-state shortcut                  → no LLM call when sources & graph_ctx both empty
```

## AI Agent (ReAct loop)

```
User message
   │
   ▼
LLM with system prompt + tool descriptions
   │
   ▼ (1..5 iterations)
THOUGHT → ACTION (tool name) → ARGS (json) → OBSERVATION
   │
   ▼
FINAL ANSWER (with citations)
```

Available tools: `search_knowledge_base`, `ask_knowledge_base`, `get_graph_stats`,
`search_graph`, `list_documents`, `get_document_insights`, `find_similar_documents`,
`generate_assume_scenario`, `predict_assume_outcome`.

## Tech stack reference

### Backend

| Layer | Technology | Version | Role |
|---|---|---|---|
| Gateway | Spring Boot + Spring Security | 3.2.4 / Java 21 | Auth, JWT, Flyway, rate limit, admin |
| Ingestion | FastAPI + spaCy + EasyOCR | 0.111 / Python 3.11 | Document parsing, NLP, embeddings |
| Graph | FastAPI + Neo4j driver | 0.111 / Python 3.11 | Graph CRUD, Cypher, search, alerts |
| AI Engine | FastAPI + scikit-learn | 0.111 / Python 3.11 | Document analytics, clustering |
| GraphRAG | FastAPI + sentence-transformers | 0.111 / Python 3.11 | Hybrid retrieval + LLM synthesis |
| Agent | FastAPI + Anthropic / OpenAI / Groq SDK | 0.111 / Python 3.11 | ReAct agent + ASSUME tools |
| ASSUME Runner | FastAPI + assume-framework | 0.4.3 / Python 3.11 | Real subprocess + SSE log streaming |

### Data and infra

| Tech | Version | Role |
|---|---|---|
| PostgreSQL | 16-alpine | Users, sessions, ingestion jobs |
| Neo4j | 5.18-community | Knowledge graph |
| Qdrant | latest | Vector store (cosine, 384-d) |
| Redis | 7-alpine | Token blacklist, cache |
| MinIO | latest | S3-compatible object store |
| Prometheus | latest | Metrics |
| Grafana | latest | Dashboards |

### Frontend

| Tech | Version | Role |
|---|---|---|
| React | 18.3 | UI |
| TypeScript | 5.6 | Type safety |
| Vite | 6.0 | Dev server |
| Tailwind CSS | 3.4 | Styling |
| Zustand | 5.0 | State |
| React Router | 6.28 | Routing |
| react-force-graph-2d | 1.29 | Graph viz |
| recharts | 2.x | Charts (ASSUME) |

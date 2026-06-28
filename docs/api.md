# CogniGrid AI . API Reference

All protected endpoints require `Authorization: Bearer <access_token>`. Tokens are
signed with HS256 by the Spring Boot gateway and verified by every Python service.

## Authentication (Gateway `:8080`)

```http
POST   /api/auth/register   {fullName, email, password}        → AuthResponse
POST   /api/auth/login      {email, password}                  → AuthResponse
POST   /api/auth/refresh    {refreshToken}                     → AuthResponse
POST   /api/auth/logout     {refreshToken}                     → 204
PUT    /api/auth/password   {currentPassword, newPassword}     → {message}
GET    /api/users/me                                           → UserInfo
```

`AuthResponse`:
```json
{
  "accessToken":  "eyJ...",
  "refreshToken": "uuid",
  "tokenType":    "Bearer",
  "expiresIn":    604800,
  "user": { "id": "uuid", "email": "x@y.z", "fullName": "X Y", "role": "ADMIN|ANALYST|VIEWER" }
}
```

## Admin (Gateway `:8080`, ADMIN role required)

```http
GET    /api/admin/users                       → AdminUser[]
GET    /api/admin/users/{id}                  → AdminUser
PUT    /api/admin/users/{id}      {fullName?, role?, active?}    → AdminUser
PUT    /api/admin/users/{id}/password   {newPassword}            → {message}
POST   /api/admin/users/{id}/suspend                              → AdminUser
POST   /api/admin/users/{id}/activate                             → AdminUser
DELETE /api/admin/users/{id}                                      → {message}
GET    /api/admin/stats                                           → AdminStats
GET    /api/admin/activity                                        → ActivityEvent[]
```

## Ingestion Service (`:8001`)

```http
POST   /api/ingestion/upload         (multipart file)        → UploadResponse
POST   /api/ingestion/upload/batch   (multipart files[])     → {jobs}
GET    /api/ingestion/jobs                                   → {jobs, total}    (filtered to caller)
GET    /api/ingestion/jobs/{id}                              → JobInfo          (404 if not owner)
DELETE /api/ingestion/jobs                                   → {deleted}        (caller's only)
DELETE /api/ingestion/jobs/{id}                              → {message}        (404 if not owner)
GET    /health
GET    /metrics
```

## Graph Service (`:8002`)

```http
GET    /api/graph/stats                       → GraphStats          (per-user)
GET    /api/graph/visualization?limit=N       → {nodes, edges}      (per-user)
GET    /api/graph/alerts                      → Alert[]             (per-user)
GET    /api/graph/export?fmt=json|csv         → file
GET    /api/graph/documents?skip=&limit=      → {documents, total}  (per-user)
GET    /api/graph/documents/{id}              → Document            (404 if not owner)
GET    /api/graph/documents/{id}/subgraph     → {nodes, edges}      (per-user)
DELETE /api/graph/documents/{id}              → {deleted}           (per-user)
GET    /api/graph/search?q=&limit=            → {nodes, total}      (per-user)
GET    /api/graph/nodes/{id}/neighbors?hops=  → {neighbors}         (per-user)
GET    /api/graph/path?from=&to=              → {path, length}      (per-user)
DELETE /api/graph/clear                       → {nodes_deleted}     (caller's only)
POST   /api/graph/cypher          {query}     → {rows, count}       (auto-scoped to caller)
```

`POST /api/graph/cypher` rewrites every `(:Document)` pattern server-side to include
`{user_id: $__cg_user_id}` so users cannot escape their subgraph even with free-form
Cypher.

## GraphRAG (`:8004`)

```http
POST /api/rag/chat     {query, top_k?, history?, use_graph_context?, llm_provider?, llm_model?, scope?}  → RAGResponse
POST /api/rag/chat/stream   (same body)                                              → SSE token stream
POST /api/rag/search   {query, top_k?, file_type_filter?}                            → SearchResponse
GET  /api/rag/providers                                                              → {providers}
```

`llm_provider` accepts `groq`, `openai`, `anthropic`, `fh` (FH GPT-OSS 120B via KIConnect), `ollama`.
`scope` is `personal` (the caller's documents, default) or `assume` (the shared ASSUME knowledge base).
`/providers` returns each provider with `status` (`active`, `quota`, `error`, `unconfigured`).

`RAGResponse`:
```json
{
  "answer": "...",
  "sources": [{"doc_id","file_name","text","score","chunk_idx"}],
  "graph_context": [{"entity_id","label","text","relations":[]}],
  "conversation_id": "uuid",
  "tokens_used": 0
}
```

When the user has no indexed sources AND no graph context, the service short-circuits
with a friendly empty-state message and returns `tokens_used: 0` (no LLM call made).

## AI Agent (`:8005`)

```http
POST /api/agent/chat              {message, history?, llm_provider?, llm_model?}  → AgentResponse
GET  /api/agent/tools                                                              → {tools}
POST /api/agent/assume/generate   {description, duration_hours, market_type}      → ScenarioYAML
POST /api/agent/assume/predict    {scenario_yaml, question?}                      → Prediction
```

The agent forwards the caller's bearer token to internal services so retrieval and
graph queries stay scoped to the user.

## ASSUME Runner (`:8006`)

```http
POST   /api/runner/runs             {yaml_config, scenario_name, description?, push_to_graph?, timeseries?}  → RunInfo
GET    /api/runner/runs                                                                          → RunInfo[]
GET    /api/runner/runs/{id}                                                                     → RunInfo
GET    /api/runner/runs/{id}/timeseries                            → {price[], dispatch{index,units,rows}}
DELETE /api/runner/runs/{id}                                                                     → {message}
GET    /api/runner/runs/{id}/logs                                  Server-Sent Events stream
GET    /health
```

`timeseries` is an optional map of raw CSV text with keys `demand`, `availability`, `fuel_prices`.
When provided it replaces the synthetic generation. `/timeseries` returns the parsed
per-timestep price curve and the stacked dispatch by unit for the results dashboard.

## AI Engine (`:8003`)

```http
GET  /api/ai/documents/{id}/insights                  → {top_entities, top_keywords, counts}
GET  /api/ai/documents/{id}/similar?top_k=            → {similar}
POST /api/ai/documents/cluster   {n_clusters, doc_ids?}  → {clusters, total_docs}
GET  /api/ai/knowledge-gaps                           → {gaps, total_entities, isolated_entity_ratio}
```

Every endpoint reads the JWT to scope results to the caller.

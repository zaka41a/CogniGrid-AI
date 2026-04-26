import axios from 'axios'

// ─── Service base URLs ─────────────────────────────────────────────────────────
const GATEWAY_URL   = import.meta.env.VITE_GATEWAY_URL   ?? 'http://localhost:8080'
const GRAPH_URL     = import.meta.env.VITE_GRAPH_URL     ?? 'http://localhost:8002'
const INGESTION_URL = import.meta.env.VITE_INGESTION_URL ?? 'http://localhost:8001'
const RAG_URL       = import.meta.env.VITE_RAG_URL       ?? 'http://localhost:8004'
const AGENT_URL     = import.meta.env.VITE_AGENT_URL     ?? 'http://localhost:8005'
const RUNNER_URL    = import.meta.env.VITE_RUNNER_URL    ?? 'http://localhost:8006'
const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL ?? 'http://localhost:8003'

// ─── Shared request interceptor ───────────────────────────────────────────────
function withAuth(instance: ReturnType<typeof axios.create>) {
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem('cg_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  instance.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('cg_token')
        localStorage.removeItem('cg_user')
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(err)
    },
  )
  return instance
}

// ─── Axios instances per service ──────────────────────────────────────────────
export const api         = withAuth(axios.create({ baseURL: GATEWAY_URL,   timeout: 30_000,  headers: { 'Content-Type': 'application/json' } }))
export const graphHttp   = withAuth(axios.create({ baseURL: GRAPH_URL,     timeout: 30_000,  headers: { 'Content-Type': 'application/json' } }))
export const ingestHttp  = withAuth(axios.create({ baseURL: INGESTION_URL, timeout: 60_000,  headers: { 'Content-Type': 'application/json' } }))
export const ragHttp     = withAuth(axios.create({ baseURL: RAG_URL,       timeout: 60_000,  headers: { 'Content-Type': 'application/json' } }))
export const agentHttp   = withAuth(axios.create({ baseURL: AGENT_URL,     timeout: 60_000,  headers: { 'Content-Type': 'application/json' } }))
export const runnerHttp  = withAuth(axios.create({ baseURL: RUNNER_URL,    timeout: 300_000, headers: { 'Content-Type': 'application/json' } }))
export const aiEngineHttp = withAuth(axios.create({ baseURL: AI_ENGINE_URL, timeout: 30_000,  headers: { 'Content-Type': 'application/json' } }))

// ─── Auth endpoints (gateway) ─────────────────────────────────────────────────
export interface LoginRequest    { email: string; password: string }
export interface RegisterRequest { fullName: string; email: string; password: string }

export interface AuthResponse {
  accessToken:   string
  refreshToken:  string
  tokenType:     string
  expiresIn:     number
  user: {
    id:       string
    email:    string
    fullName: string
    role:     string
  }
}

export const authApi = {
  login:    (data: LoginRequest)    => api.post<AuthResponse>('/api/auth/login',    data),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/api/auth/register', data),
  me:       ()                      => api.get<AuthResponse>('/api/auth/me'),
}

// ─── Graph endpoints (graph service :8002) ────────────────────────────────────
export interface GraphStats    { nodeCount: number; edgeCount: number; rdfTriples: number; documentCount: number }
export interface GraphNode     { id: string; label: string; type?: string; properties?: Record<string, unknown> }
export interface GraphEdge     { source: string; target: string; label: string }
export interface SearchResult  { nodes: GraphNode[]; edges?: GraphEdge[]; total: number }

// Raw shape returned by the backend
interface _RawGraphStats { total_nodes: number; total_relationships: number; node_labels: Record<string, number>; relationship_types: Record<string, number> }

export const graphApi = {
  stats: async (): Promise<{ data: GraphStats }> => {
    const res = await graphHttp.get<_RawGraphStats>('/api/graph/stats')
    const r = res.data
    const documentCount = (r.node_labels?.Document ?? 0)
    const data: GraphStats = {
      nodeCount:     r.total_nodes,
      edgeCount:     r.total_relationships,
      rdfTriples:    r.total_nodes + r.total_relationships,
      documentCount,
    }
    return { data }
  },
  search:    (q: string)  => graphHttp.get<SearchResult>('/api/graph/search', { params: { q } }),
  neighbors: (id: string) => graphHttp.get<GraphNode[]>(`/api/graph/nodes/${id}/neighbors`),
  documents: ()           => graphHttp.get('/api/graph/documents'),
  deleteDoc: (id: string) => graphHttp.delete(`/api/graph/documents/${id}`),
  clearAll:  ()           => graphHttp.delete<{ message: string; nodes_deleted: number }>('/api/graph/clear'),
  cypher:    (query: string) => graphHttp.post<{ rows: Record<string, unknown>[]; count: number }>('/api/graph/cypher', { query }),
}

// ─── Ingestion endpoints (ingestion service :8001) ────────────────────────────
// Field names match the Python backend (snake_case)
export interface IngestJob {
  id:              string
  file_name:       string
  file_type?:      string
  file_size?:      number
  status:          'pending' | 'processing' | 'completed' | 'failed'
  progress:        number
  nodes_extracted?: number
  error?:          string | null
}

export const ingestionApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return ingestHttp.post<IngestJob>('/api/ingestion/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000, // 5 min — NLP extraction can be slow for large files
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / (e.total ?? 1))),
    })
  },
  jobs:         ()           => ingestHttp.get<{ jobs: IngestJob[]; total: number }>('/api/ingestion/jobs'),
  jobById:      (id: string) => ingestHttp.get<IngestJob>(`/api/ingestion/jobs/${id}`),
  deleteJob:    (id: string) => ingestHttp.delete(`/api/ingestion/jobs/${id}`),
  clearAllJobs: ()           => ingestHttp.delete<{ message: string; deleted: number }>('/api/ingestion/jobs'),
}

// ─── RAG / GraphRAG endpoints (graphrag service :8004) ────────────────────────
export interface RagRequest  { query: string; provider?: string; llm_provider?: string; llm_model?: string; history?: { role: string; content: string }[]; use_graph_context?: boolean }
export interface RagSource   { doc_id: string; file_name: string; text: string; score: number; chunk_idx: number }
export interface GraphCtx    { entity_id: string; label: string; text: string; relations: string[] }
export interface RagResponse { answer: string; sources: RagSource[]; graph_context: GraphCtx[]; conversation_id: string; tokens_used: number }

export const ragApi = {
  chat:   (data: RagRequest) => ragHttp.post<RagResponse>('/api/rag/chat', data),
  search: (q: string)        => ragHttp.post('/api/rag/search', { query: q }),
}

// ─── Agent endpoints (agent service :8005) ────────────────────────────────────
export interface AgentMessage  { role: 'user' | 'assistant'; content: string }
export interface AgentRequest  { message: string; history?: AgentMessage[]; llm_provider?: string; llm_model?: string }
export interface AgentToolCall { tool: string; args: Record<string, unknown>; result: unknown }
export interface AgentResponse {
  answer:      string
  session_id:  string
  tool_calls:  AgentToolCall[]
  reasoning:   string
  tokens_used: number
}

export const agentApi = {
  chat:  (data: AgentRequest) => agentHttp.post<AgentResponse>('/api/agent/chat', data),
  tools: ()                   => agentHttp.get<{ name: string; description: string }[]>('/api/agent/tools'),
}

// ─── Profile / Subscription endpoints (gateway :8080) ────────────────────────
export const profileApi = {
  getMe:        ()                       => api.get('/api/auth/me'),
  updateMe:     (data: { fullName?: string; email?: string }) => api.put('/api/auth/me', data),
  uploadAvatar: (file: File)             => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post('/api/auth/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  changePlan:   (plan: string)           => api.post('/api/subscriptions/change', { plan }),
  getUsage:     ()                       => api.get('/api/subscriptions/usage'),
}

// ─── Admin endpoints (gateway :8080) ──────────────────────────────────────────
export interface AdminUser {
  id:          string
  email:       string
  fullName:    string
  role:        'ADMIN' | 'ANALYST' | 'VIEWER'
  active:      boolean
  lastLoginAt: string | null
  createdAt:   string
  updatedAt:   string
}

export interface AdminStats {
  totalUsers:     number
  activeUsers:    number
  suspendedUsers: number
  admins:         number
  roleCounts:     Record<string, number>
}

export interface ActivityEvent {
  id:           string
  actorEmail:   string
  targetId:     string | null
  targetEmail:  string | null
  type:         string
  detail:       string | null
  ipAddress:    string | null
  createdAt:    string
}

export const adminApi = {
  users:          ()                                                      => api.get<AdminUser[]>('/api/admin/users'),
  getUser:        (id: string)                                            => api.get<AdminUser>(`/api/admin/users/${id}`),
  updateUser:     (id: string, data: Partial<{ fullName: string; role: string; active: boolean }>) =>
                                                                              api.put<AdminUser>(`/api/admin/users/${id}`, data),
  resetPassword:  (id: string, newPassword: string)                       =>
                                                                              api.put<{ message: string }>(`/api/admin/users/${id}/password`, { newPassword }),
  suspendUser:    (id: string)                                            => api.post<AdminUser>(`/api/admin/users/${id}/suspend`),
  activateUser:   (id: string)                                            => api.post<AdminUser>(`/api/admin/users/${id}/activate`),
  deleteUser:     (id: string)                                            => api.delete<{ message: string }>(`/api/admin/users/${id}`),
  stats:          ()                                                      => api.get<AdminStats>('/api/admin/stats'),
  activity:       (limit = 100)                                           => api.get<ActivityEvent[]>('/api/admin/activity', { params: { limit } }),
}

// ─── AI Engine endpoints (ai-engine service :8003) ────────────────────────────
// Calls go directly to the AI Engine — the gateway does not proxy these.
export const aiEngineApi = {
  similar:       (docId: string) => aiEngineHttp.get(`/api/ai/documents/${docId}/similar`),
  insights:      (docId: string) => aiEngineHttp.get(`/api/ai/documents/${docId}/insights`),
  cluster:       (k: number)     => aiEngineHttp.post('/api/ai/documents/cluster', { n_clusters: k }),
  knowledgeGaps: ()              => aiEngineHttp.get('/api/ai/knowledge-gaps'),
}

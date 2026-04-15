import axios from 'axios'

// ─── Service base URLs ─────────────────────────────────────────────────────────
const GATEWAY_URL   = import.meta.env.VITE_GATEWAY_URL   ?? 'http://localhost:8080'
const GRAPH_URL     = import.meta.env.VITE_GRAPH_URL     ?? 'http://localhost:8002'
const INGESTION_URL = import.meta.env.VITE_INGESTION_URL ?? 'http://localhost:8001'
const RAG_URL       = import.meta.env.VITE_RAG_URL       ?? 'http://localhost:8004'
const AGENT_URL     = import.meta.env.VITE_AGENT_URL     ?? 'http://localhost:8005'

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
export const api         = withAuth(axios.create({ baseURL: GATEWAY_URL,   timeout: 30_000, headers: { 'Content-Type': 'application/json' } }))
export const graphHttp   = withAuth(axios.create({ baseURL: GRAPH_URL,     timeout: 30_000, headers: { 'Content-Type': 'application/json' } }))
export const ingestHttp  = withAuth(axios.create({ baseURL: INGESTION_URL, timeout: 60_000, headers: { 'Content-Type': 'application/json' } }))
export const ragHttp     = withAuth(axios.create({ baseURL: RAG_URL,       timeout: 60_000, headers: { 'Content-Type': 'application/json' } }))
export const agentHttp   = withAuth(axios.create({ baseURL: AGENT_URL,     timeout: 60_000, headers: { 'Content-Type': 'application/json' } }))

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
export interface GraphNode     { id: string; label: string; type: string; properties?: Record<string, string> }
export interface SearchResult  { id: string; label: string; type: string; score: number }

export const graphApi = {
  stats:     ()           => graphHttp.get<GraphStats>('/api/graph/stats'),
  search:    (q: string)  => graphHttp.get<SearchResult[]>('/api/graph/search', { params: { q } }),
  neighbors: (id: string) => graphHttp.get<GraphNode[]>(`/api/graph/nodes/${id}/neighbors`),
  documents: ()           => graphHttp.get('/api/graph/documents'),
  deleteDoc: (id: string) => graphHttp.delete(`/api/graph/documents/${id}`),
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
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / (e.total ?? 1))),
    })
  },
  // Backend returns { jobs: [...], total: N }
  jobs:      ()           => ingestHttp.get<{ jobs: IngestJob[]; total: number }>('/api/ingestion/jobs'),
  jobById:   (id: string) => ingestHttp.get<IngestJob>(`/api/ingestion/jobs/${id}`),
  deleteJob: (id: string) => ingestHttp.delete(`/api/ingestion/jobs/${id}`),
}

// ─── RAG / GraphRAG endpoints (graphrag service :8004) ────────────────────────
export interface RagRequest  { question: string; provider?: string; llmProvider?: string; llmModel?: string }
export interface RagResponse { answer: string; sources: RagSource[]; graphContext: GraphCtx[] }
export interface RagSource   { chunkId: string; documentId: string; text: string; score: number }
export interface GraphCtx    { nodeId: string; label: string; type: string; properties: Record<string, string> }

export const ragApi = {
  chat:   (data: RagRequest) => ragHttp.post<RagResponse>('/api/rag/chat', data),
  search: (q: string)        => ragHttp.post('/api/rag/search', { query: q }),
}

// ─── Agent endpoints (agent service :8005) ────────────────────────────────────
export interface AgentMessage  { role: 'user' | 'assistant'; content: string }
export interface AgentRequest  { message: string; history?: AgentMessage[]; llmProvider?: string }
export interface AgentResponse {
  response:  string
  steps:     { thought: string; action?: string; observation?: string }[]
  toolsUsed: string[]
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
export const adminApi = {
  users:       ()           => api.get('/api/admin/users'),
  getUser:     (id: string) => api.get(`/api/admin/users/${id}`),
  updateUser:  (id: string, data: object) => api.put(`/api/admin/users/${id}`, data),
  suspendUser: (id: string) => api.post(`/api/admin/users/${id}/suspend`),
  deleteUser:  (id: string) => api.delete(`/api/admin/users/${id}`),
  stats:       ()           => api.get('/api/admin/stats'),
}

// ─── AI Engine endpoints (ai-engine service :8003) ────────────────────────────
export const aiEngineApi = {
  similar:       (docId: string) => api.get(`/api/ai/documents/${docId}/similar`),
  insights:      (docId: string) => api.get(`/api/ai/documents/${docId}/insights`),
  cluster:       (k: number)     => api.post('/api/ai/documents/cluster', { k }),
  knowledgeGaps: ()              => api.get('/api/ai/knowledge-gaps'),
}

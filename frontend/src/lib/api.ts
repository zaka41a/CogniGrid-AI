import axios from 'axios'

// ─── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cg_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor: handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cg_token')
      localStorage.removeItem('cg_user')
      // Redirect to login — avoid circular import with router
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export interface LoginRequest    { email: string; password: string }
export interface RegisterRequest { fullName: string; email: string; password: string }

export interface AuthResponse {
  token:    string
  userId:   string
  name:     string
  email:    string
  role:     string
}

export const authApi = {
  login:    (data: LoginRequest)    => api.post<AuthResponse>('/api/auth/login',    data),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/api/auth/register', data),
  me:       ()                      => api.get<AuthResponse>('/api/auth/me'),
}

// ─── Graph endpoints ──────────────────────────────────────────────────────────
export interface GraphStats {
  nodeCount:    number
  edgeCount:    number
  rdfTriples:   number
  documentCount: number
}

export interface GraphNode {
  id: string; label: string; type: string
  properties?: Record<string, string>
}

export interface SearchResult {
  id: string; label: string; type: string; score: number
}

export const graphApi = {
  stats:      ()                    => api.get<GraphStats>('/api/graph/stats'),
  search:     (q: string)           => api.get<SearchResult[]>('/api/graph/search', { params: { q } }),
  neighbors:  (id: string)          => api.get<GraphNode[]>(`/api/graph/nodes/${id}/neighbors`),
  documents:  ()                    => api.get('/api/graph/documents'),
  deleteDoc:  (id: string)          => api.delete(`/api/graph/documents/${id}`),
}

// ─── Ingestion endpoints ──────────────────────────────────────────────────────
export interface IngestJob {
  jobId:    string
  filename: string
  status:   'queued' | 'processing' | 'done' | 'error'
  progress: number
  createdAt: string
}

export const ingestionApi = {
  upload:   (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<IngestJob>('/api/ingestion/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / (e.total ?? 1))),
    })
  },
  jobs:     ()         => api.get<IngestJob[]>('/api/ingestion/jobs'),
  jobById:  (id: string) => api.get<IngestJob>(`/api/ingestion/jobs/${id}`),
}

// ─── RAG / GraphRAG endpoints ─────────────────────────────────────────────────
export interface RagRequest  { question: string; llmProvider?: string; llmModel?: string }
export interface RagResponse { answer: string; sources: RagSource[]; graphContext: GraphCtx[] }
export interface RagSource   { chunkId: string; documentId: string; text: string; score: number }
export interface GraphCtx    { nodeId: string; label: string; type: string; properties: Record<string, string> }

export const ragApi = {
  chat:   (data: RagRequest) => api.post<RagResponse>('/api/rag/chat', data),
  search: (q: string)        => api.post('/api/rag/search', { query: q }),
}

// ─── Agent endpoints ──────────────────────────────────────────────────────────
export interface AgentMessage { role: 'user' | 'assistant'; content: string }
export interface AgentRequest { message: string; history?: AgentMessage[]; llmProvider?: string }
export interface AgentResponse {
  response: string
  steps:    { thought: string; action?: string; observation?: string }[]
  toolsUsed: string[]
}

export const agentApi = {
  chat:  (data: AgentRequest) => api.post<AgentResponse>('/api/agent/chat', data),
  tools: ()                   => api.get<{ name: string; description: string }[]>('/api/agent/tools'),
}

// ─── AI Engine endpoints ──────────────────────────────────────────────────────
export const aiEngineApi = {
  similar:    (docId: string)          => api.get(`/api/ai/documents/${docId}/similar`),
  insights:   (docId: string)          => api.get(`/api/ai/documents/${docId}/insights`),
  cluster:    (k: number)              => api.post('/api/ai/documents/cluster', { k }),
  knowledgeGaps: ()                    => api.get('/api/ai/knowledge-gaps'),
}

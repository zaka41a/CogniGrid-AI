// ─── KPI / Dashboard ──────────────────────────────────────────────────────────
export interface KPICard {
  label: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: string
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface AnomalyBarPoint {
  system: string
  score: number
}

export interface ActivityEvent {
  id: string
  icon: 'alert' | 'upload' | 'graph' | 'ai' | 'user' | 'check'
  title: string
  description: string
  timestamp: string
  severity?: 'info' | 'warning' | 'critical'
}

// ─── Ingestion ────────────────────────────────────────────────────────────────
export type IngestionStatus = 'Processing' | 'Success' | 'Error'
export type FileFormat = 'CSV' | 'Excel' | 'JSON' | 'XML'

export interface IngestionRecord {
  id: string
  filename: string
  format: FileFormat
  size: string
  status: IngestionStatus
  date: string
  rowsIngested: number | null
}

// ─── Knowledge Graph ──────────────────────────────────────────────────────────
export type NodeType = 'Asset' | 'Sensor' | 'Alert' | 'Location'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
}

export interface GraphEdge {
  source: string
  target: string
}

export interface NodeDetail {
  id: string
  name: string
  type: NodeType
  properties: Record<string, string | number>
  connectedNodes: string[]
}

export interface GraphStats {
  nodes: number
  edges: number
  rdfTriples: number
  sparqlQueries: number
}

// ─── AI Engine ────────────────────────────────────────────────────────────────
export type Severity = 'Low' | 'Medium' | 'Critical'

export interface AnomalyRow {
  id: string
  timestamp: string
  system: string
  score: number
  severity: Severity
}

export interface PredictionPoint {
  time: string
  actual: number
  predicted: number
}

export interface ClassificationResult {
  label: string
  confidence: number
}

// ─── Agent / Chat ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
  tools?: string[]
  sources?: { title: string; chunk: string }[]
}

export interface Conversation {
  id: string
  title: string
  date: string
  messages: ChatMessage[]
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved'

export interface Alert {
  id: string
  system: string
  type: string
  severity: Severity
  message: string
  timestamp: string
  status: AlertStatus
  timeline: AlertTimelineEvent[]
}

export interface AlertTimelineEvent {
  time: string
  event: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface AIModel {
  id: string
  name: string
  type: string
  enabled: boolean
  threshold: number
}

export interface RBACRole {
  role: string
  permissions: Record<string, boolean>
}

// ─── Global State ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'warning' | 'critical'
}

export interface CurrentUser {
  name: string
  email?: string
  role: string
  initials: string
}

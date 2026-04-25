import type {
  ActivityEvent,
  AnomalyRow,
  Alert,
  AIModel,
  RBACRole,
  IngestionRecord,
  Conversation,
  GraphNode,
  GraphEdge,
  NodeDetail,
  PredictionPoint,
  ClassificationResult,
  TimeSeriesPoint,
  AnomalyBarPoint,
  Notification,
} from '../types'

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const mockIngestionTimeSeries: TimeSeriesPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-03-04')
  d.setDate(d.getDate() + i)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Math.floor(2000 + Math.random() * 8000),
  }
})

export const mockAnomalyBarData: AnomalyBarPoint[] = [
  { system: 'Energy Grid', score: 0.87 },
  { system: 'Network', score: 0.42 },
  { system: 'Sensors', score: 0.61 },
  { system: 'SCADA', score: 0.29 },
  { system: 'Telemetry', score: 0.74 },
]

export const mockActivityFeed: ActivityEvent[] = [
  {
    id: 'a1',
    icon: 'alert',
    title: 'Critical anomaly detected',
    description: 'Energy grid node EG-447 exceeded threshold (0.91)',
    timestamp: '2026-04-02T14:32:00Z',
    severity: 'critical',
  },
  {
    id: 'a2',
    icon: 'upload',
    title: 'Data ingestion completed',
    description: 'grid_sensors_march.csv — 12,450 rows processed',
    timestamp: '2026-04-02T13:58:00Z',
    severity: 'info',
  },
  {
    id: 'a3',
    icon: 'graph',
    title: 'Knowledge graph updated',
    description: '340 new RDF triples added from sensor batch',
    timestamp: '2026-04-02T13:12:00Z',
    severity: 'info',
  },
  {
    id: 'a4',
    icon: 'ai',
    title: 'Prediction model retrained',
    description: 'Energy Consumption model — new accuracy: 94.2%',
    timestamp: '2026-04-02T11:45:00Z',
    severity: 'info',
  },
  {
    id: 'a5',
    icon: 'alert',
    title: 'Warning: Network latency spike',
    description: 'Node NET-12 latency > 200ms for 5 consecutive minutes',
    timestamp: '2026-04-02T10:30:00Z',
    severity: 'warning',
  },
  {
    id: 'a6',
    icon: 'user',
    title: 'New user login',
    description: 'Sarah Chen (Analyst) logged in from 192.168.1.45',
    timestamp: '2026-04-02T09:15:00Z',
    severity: 'info',
  },
  {
    id: 'a7',
    icon: 'check',
    title: 'Alert resolved',
    description: 'SCADA-03 pressure alert acknowledged and resolved',
    timestamp: '2026-04-02T08:42:00Z',
    severity: 'info',
  },
  {
    id: 'a8',
    icon: 'upload',
    title: 'Scheduled import started',
    description: 'Daily SCADA telemetry import — 08:00 UTC',
    timestamp: '2026-04-02T08:00:00Z',
    severity: 'info',
  },
]

// ─── Ingestion ────────────────────────────────────────────────────────────────
export const mockIngestionRecords: IngestionRecord[] = [
  { id: 'i1', filename: 'grid_sensors_march.csv', format: 'CSV', size: '4.2 MB', status: 'Success', date: '2026-04-02', rowsIngested: 12450 },
  { id: 'i2', filename: 'scada_telemetry_q1.xlsx', format: 'Excel', size: '8.7 MB', status: 'Success', date: '2026-04-01', rowsIngested: 34200 },
  { id: 'i3', filename: 'network_topology.json', format: 'JSON', size: '1.1 MB', status: 'Processing', date: '2026-04-02', rowsIngested: null },
  { id: 'i4', filename: 'cim_schema_v3.xml', format: 'XML', size: '22.3 MB', status: 'Success', date: '2026-03-31', rowsIngested: 98750 },
  { id: 'i5', filename: 'anomaly_labels_feb.csv', format: 'CSV', size: '0.8 MB', status: 'Error', date: '2026-03-30', rowsIngested: null },
  { id: 'i6', filename: 'asset_registry_2026.xlsx', format: 'Excel', size: '5.4 MB', status: 'Success', date: '2026-03-29', rowsIngested: 4100 },
  { id: 'i7', filename: 'realtime_stream_batch.json', format: 'JSON', size: '3.3 MB', status: 'Success', date: '2026-03-28', rowsIngested: 18900 },
  { id: 'i8', filename: 'sensor_config_export.xml', format: 'XML', size: '0.6 MB', status: 'Error', date: '2026-03-27', rowsIngested: null },
]

// ─── Knowledge Graph ──────────────────────────────────────────────────────────
export const mockGraphNodes: GraphNode[] = [
  { id: 'n1',  label: 'Substation A',  type: 'Asset',    x: 300, y: 120 },
  { id: 'n2',  label: 'Substation B',  type: 'Asset',    x: 520, y: 200 },
  { id: 'n3',  label: 'Sensor EG-01',  type: 'Sensor',   x: 180, y: 240 },
  { id: 'n4',  label: 'Sensor EG-02',  type: 'Sensor',   x: 400, y: 310 },
  { id: 'n5',  label: 'Alert EG-447',  type: 'Alert',    x: 600, y: 120 },
  { id: 'n6',  label: 'Grid Zone 1',   type: 'Location', x: 260, y: 380 },
  { id: 'n7',  label: 'Grid Zone 2',   type: 'Location', x: 480, y: 420 },
  { id: 'n8',  label: 'Transformer 1', type: 'Asset',    x: 150, y: 130 },
  { id: 'n9',  label: 'Sensor NET-12', type: 'Sensor',   x: 640, y: 300 },
  { id: 'n10', label: 'Alert NET-01',  type: 'Alert',    x: 700, y: 200 },
  { id: 'n11', label: 'Data Center 1', type: 'Location', x: 560, y: 380 },
  { id: 'n12', label: 'SCADA-03',      type: 'Asset',    x: 350, y: 200 },
  { id: 'n13', label: 'Sensor SC-01',  type: 'Sensor',   x: 100, y: 330 },
  { id: 'n14', label: 'Region North',  type: 'Location', x: 430, y: 80  },
  { id: 'n15', label: 'Meter M-200',   type: 'Asset',    x: 700, y: 420 },
]

export const mockGraphEdges: GraphEdge[] = [
  { source: 'n1',  target: 'n3'  },
  { source: 'n1',  target: 'n4'  },
  { source: 'n1',  target: 'n8'  },
  { source: 'n2',  target: 'n4'  },
  { source: 'n2',  target: 'n5'  },
  { source: 'n2',  target: 'n9'  },
  { source: 'n3',  target: 'n6'  },
  { source: 'n4',  target: 'n12' },
  { source: 'n5',  target: 'n10' },
  { source: 'n6',  target: 'n13' },
  { source: 'n7',  target: 'n11' },
  { source: 'n9',  target: 'n10' },
  { source: 'n9',  target: 'n11' },
  { source: 'n12', target: 'n6'  },
  { source: 'n14', target: 'n1'  },
  { source: 'n14', target: 'n2'  },
  { source: 'n15', target: 'n7'  },
  { source: 'n15', target: 'n11' },
]

export const mockSelectedNode: NodeDetail = {
  id: 'n1',
  name: 'Substation A',
  type: 'Asset',
  properties: {
    voltage: '110 kV',
    capacity: '250 MVA',
    status: 'Operational',
    lastInspection: '2026-02-14',
    owner: 'Grid Operator GmbH',
    installYear: 2008,
  },
  connectedNodes: ['Sensor EG-01', 'Sensor EG-02', 'Transformer 1', 'Region North'],
}

// ─── AI Engine ────────────────────────────────────────────────────────────────
export const mockAnomalyRows: AnomalyRow[] = [
  { id: 'an1',  timestamp: '2026-04-02 14:32', system: 'Energy Grid',  score: 0.91, severity: 'Critical' },
  { id: 'an2',  timestamp: '2026-04-02 13:58', system: 'Telemetry',    score: 0.74, severity: 'Medium'   },
  { id: 'an3',  timestamp: '2026-04-02 13:12', system: 'Sensors',      score: 0.61, severity: 'Medium'   },
  { id: 'an4',  timestamp: '2026-04-02 11:45', system: 'Network',      score: 0.87, severity: 'Critical' },
  { id: 'an5',  timestamp: '2026-04-02 11:03', system: 'SCADA',        score: 0.34, severity: 'Low'      },
  { id: 'an6',  timestamp: '2026-04-02 10:30', system: 'Energy Grid',  score: 0.55, severity: 'Medium'   },
  { id: 'an7',  timestamp: '2026-04-02 09:15', system: 'Sensors',      score: 0.22, severity: 'Low'      },
  { id: 'an8',  timestamp: '2026-04-02 08:42', system: 'Telemetry',    score: 0.78, severity: 'Critical' },
  { id: 'an9',  timestamp: '2026-04-02 07:11', system: 'Network',      score: 0.41, severity: 'Low'      },
  { id: 'an10', timestamp: '2026-04-02 06:00', system: 'SCADA',        score: 0.69, severity: 'Medium'   },
]

export const mockPredictionData: PredictionPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  actual: Math.round(3500 + Math.sin(i * 0.4) * 800 + Math.random() * 200),
  predicted: Math.round(3500 + Math.sin(i * 0.4) * 800 + (i > 18 ? 0 : Math.random() * 150)),
}))

export const mockClassificationResults: ClassificationResult[] = [
  { label: 'Normal Operation',      confidence: 0.72 },
  { label: 'Sensor Drift',          confidence: 0.18 },
  { label: 'Grid Fault Precursor',  confidence: 0.07 },
  { label: 'Data Corruption',       confidence: 0.03 },
]

// ─── Agent ────────────────────────────────────────────────────────────────────
export const mockConversations: Conversation[] = [
  {
    id: 'c1',
    title: 'Energy grid risk analysis',
    date: '2026-04-02',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What is the risk level in the energy grid system?',
        timestamp: '14:30',
      },
      {
        id: 'm2',
        role: 'ai',
        content: `Based on my analysis of the knowledge graph and anomaly model, here is the current risk assessment for the **Energy Grid** system:\n\n**Risk Score: 0.87 / 1.00 — CRITICAL**\n\n**Affected Nodes:**\n- EG-447 (Substation A) — anomaly score 0.91\n- EG-023 (Transformer 1) — anomaly score 0.74\n- EG-112 (Sensor cluster) — anomaly score 0.68\n\n**Recommendation:** Immediate inspection of Substation A is advised. Consider load balancing between Grid Zone 1 and Zone 2 to reduce stress on EG-447. Alert status has been escalated to critical tier.`,
        timestamp: '14:30',
        tools: ['graph_query', 'anomaly_model'],
      },
      {
        id: 'm3',
        role: 'user',
        content: 'Which node is most critical?',
        timestamp: '14:31',
      },
      {
        id: 'm4',
        role: 'ai',
        content: `The most critical node is **EG-447 (Substation A)**.\n\n**Why it's critical:**\n- Highest anomaly score in the network: **0.91**\n- Handles load for 3 downstream grid zones (Zone 1, Zone 2, Zone North)\n- Last maintenance check: 47 days ago (overdue by 17 days)\n- Connected to 4 sensors, 2 of which are reporting irregular voltage readings\n\nRisk propagation analysis shows that a failure at EG-447 would cascade to approximately **12 dependent assets** and affect **~340,000 end-users** in the modeled service area.`,
        timestamp: '14:31',
        tools: ['graph_query', 'risk_propagation'],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Network load prediction',
    date: '2026-04-01',
    messages: [],
  },
  {
    id: 'c3',
    title: 'SCADA sensor classification',
    date: '2026-03-31',
    messages: [],
  },
  {
    id: 'c4',
    title: 'RDF triple analysis',
    date: '2026-03-30',
    messages: [],
  },
  {
    id: 'c5',
    title: 'Anomaly threshold tuning',
    date: '2026-03-28',
    messages: [],
  },
]

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const mockAlerts: Alert[] = [
  {
    id: 'ALT-001', system: 'Energy Grid', type: 'Voltage Anomaly', severity: 'Critical',
    message: 'Substation EG-447 voltage deviation exceeds 15% threshold',
    timestamp: '2026-04-02 14:32', status: 'Open',
    timeline: [
      { time: '14:32', event: 'Alert triggered — anomaly score 0.91 detected' },
      { time: '14:33', event: 'Notification sent to on-call engineer' },
      { time: '14:35', event: 'Auto-isolation protocol initiated' },
    ],
  },
  {
    id: 'ALT-002', system: 'Network', type: 'Latency Spike', severity: 'Medium',
    message: 'Node NET-12 latency exceeds 200ms for 5 consecutive minutes',
    timestamp: '2026-04-02 10:30', status: 'Acknowledged',
    timeline: [
      { time: '10:30', event: 'Alert triggered — latency 248ms' },
      { time: '10:45', event: 'Acknowledged by Sarah Chen' },
    ],
  },
  {
    id: 'ALT-003', system: 'SCADA', type: 'Pressure Fault', severity: 'Low',
    message: 'SCADA-03 pressure reading below minimum threshold',
    timestamp: '2026-04-02 08:42', status: 'Resolved',
    timeline: [
      { time: '08:42', event: 'Alert triggered' },
      { time: '09:10', event: 'Valve recalibrated by field team' },
      { time: '09:15', event: 'Alert resolved' },
    ],
  },
  {
    id: 'ALT-004', system: 'Sensors', type: 'Data Gap', severity: 'Medium',
    message: 'Sensor SC-09 stopped reporting for 12 minutes',
    timestamp: '2026-04-02 07:11', status: 'Open',
    timeline: [
      { time: '07:11', event: 'Gap detected in sensor stream' },
    ],
  },
  {
    id: 'ALT-005', system: 'Telemetry', type: 'Sync Failure', severity: 'Critical',
    message: 'Telemetry batch #TLM-2026-092 failed to synchronize',
    timestamp: '2026-04-01 23:58', status: 'Acknowledged',
    timeline: [
      { time: '23:58', event: 'Sync failure detected' },
      { time: '00:05', event: 'Retry #1 failed' },
      { time: '00:15', event: 'Acknowledged by system admin' },
    ],
  },
  {
    id: 'ALT-006', system: 'Energy Grid', type: 'Overload Risk', severity: 'Critical',
    message: 'Grid Zone 2 projected to exceed capacity within 2 hours',
    timestamp: '2026-04-01 22:10', status: 'Open',
    timeline: [
      { time: '22:10', event: 'Predictive alert triggered — 94% capacity forecast' },
    ],
  },
  {
    id: 'ALT-007', system: 'Network', type: 'Packet Loss', severity: 'Low',
    message: 'NET-08 reporting 3.2% packet loss — below action threshold',
    timestamp: '2026-04-01 19:40', status: 'Resolved',
    timeline: [
      { time: '19:40', event: 'Packet loss rate flagged' },
      { time: '20:00', event: 'Auto-resolved — rate normalized' },
    ],
  },
  {
    id: 'ALT-008', system: 'SCADA', type: 'Auth Failure', severity: 'Medium',
    message: '3 consecutive failed login attempts on SCADA-01 console',
    timestamp: '2026-04-01 17:22', status: 'Acknowledged',
    timeline: [
      { time: '17:22', event: '3rd failed attempt logged' },
      { time: '17:25', event: 'Account locked — security team notified' },
    ],
  },
  {
    id: 'ALT-009', system: 'Sensors', type: 'Calibration Drift', severity: 'Low',
    message: 'Sensor EG-03 showing 2.1% drift from baseline calibration',
    timestamp: '2026-04-01 14:05', status: 'Open',
    timeline: [
      { time: '14:05', event: 'Calibration drift detected by model' },
    ],
  },
  {
    id: 'ALT-010', system: 'Telemetry', type: 'High Frequency', severity: 'Medium',
    message: 'Telemetry burst rate 4× above normal on channel TLM-CH-7',
    timestamp: '2026-04-01 11:30', status: 'Resolved',
    timeline: [
      { time: '11:30', event: 'Rate spike detected' },
      { time: '11:45', event: 'Rate limiter applied' },
      { time: '12:00', event: 'Resolved' },
    ],
  },
  {
    id: 'ALT-011', system: 'Energy Grid', type: 'Maintenance Due', severity: 'Low',
    message: 'Transformer T-07 maintenance interval exceeded by 17 days',
    timestamp: '2026-03-31 09:00', status: 'Acknowledged',
    timeline: [
      { time: '09:00', event: 'Scheduled maintenance alert triggered' },
      { time: '09:30', event: 'Work order WO-2026-344 created' },
    ],
  },
  {
    id: 'ALT-012', system: 'Network', type: 'Topology Change', severity: 'Medium',
    message: 'Unexpected topology change detected — 2 nodes unreachable',
    timestamp: '2026-03-30 16:55', status: 'Resolved',
    timeline: [
      { time: '16:55', event: 'Topology mismatch detected' },
      { time: '17:10', event: 'Root cause: scheduled maintenance window' },
      { time: '17:30', event: 'Nodes restored — alert resolved' },
    ],
  },
]

// ─── Settings ─────────────────────────────────────────────────────────────────
export const mockAIModels: AIModel[] = [
  { id: 'm1', name: 'Anomaly Detector v2.1',   type: 'Unsupervised',   enabled: true,  threshold: 0.75 },
  { id: 'm2', name: 'Energy Predictor v1.4',   type: 'Time Series',    enabled: true,  threshold: 0.80 },
  { id: 'm3', name: 'Network Classifier v3.0', type: 'Supervised',     enabled: false, threshold: 0.65 },
  { id: 'm4', name: 'Sensor Fault Model v1.1', type: 'Semi Supervised', enabled: true, threshold: 0.70 },
]

export const mockRBACRoles: RBACRole[] = [
  {
    role: 'Admin',
    permissions: {
      viewDashboard: true, manageUsers: true, importData: true,
      runModels: true, editSettings: true, acknowledgeAlerts: true, viewGraph: true,
    },
  },
  {
    role: 'Analyst',
    permissions: {
      viewDashboard: true, manageUsers: false, importData: true,
      runModels: true, editSettings: false, acknowledgeAlerts: true, viewGraph: true,
    },
  },
  {
    role: 'Viewer',
    permissions: {
      viewDashboard: true, manageUsers: false, importData: false,
      runModels: false, editSettings: false, acknowledgeAlerts: false, viewGraph: true,
    },
  },
]

// ─── Notifications ────────────────────────────────────────────────────────────
export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    title: 'Critical alert: EG-447',
    message: 'Substation A voltage anomaly score 0.91',
    time: '2 min ago',
    read: false,
    type: 'critical',
  },
  {
    id: 'notif2',
    title: 'Ingestion completed',
    message: 'grid_sensors_march.csv — 12,450 rows',
    time: '34 min ago',
    read: false,
    type: 'info',
  },
  {
    id: 'notif3',
    title: 'Model retrained',
    message: 'Energy Predictor v1.4 accuracy: 94.2%',
    time: '2h ago',
    read: true,
    type: 'info',
  },
]

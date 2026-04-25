import { useEffect, useState, useCallback } from 'react'
import {
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle,
  RefreshCw, Wrench, XCircle, Info, Trash2,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { graphApi, graphHttp, ingestionApi, ingestHttp } from '../lib/api'

type Severity = 'critical' | 'warning' | 'info'

interface QualityIssue {
  id:        string
  category:  string
  severity:  Severity
  title:     string
  detail:    string
  fix?:      string
  fixAction?: () => Promise<void>
  fixed:     boolean
}

function SeverityIcon({ sev }: { sev: Severity }) {
  if (sev === 'critical') return <AlertCircle size={14} className="text-red-500 shrink-0" />
  if (sev === 'warning')  return <AlertTriangle size={14} className="text-amber-500 shrink-0" />
  return <Info size={14} className="text-blue-400 shrink-0" />
}

function SeverityBadge({ sev }: { sev: Severity }) {
  if (sev === 'critical') return <Badge variant="danger">Critical</Badge>
  if (sev === 'warning')  return <Badge variant="warning">Warning</Badge>
  return <Badge variant="info">Info</Badge>
}

export default function DataQuality() {
  const [issues, setIssues]     = useState<QualityIssue[]>([])
  const [loading, setLoading]   = useState(true)
  const [fixing,  setFixing]    = useState<string | null>(null)
  const [score,   setScore]     = useState(100)
  const [clearMsg, setClearMsg] = useState<string | null>(null)

  const buildIssues = useCallback((
    graphRaw: Record<string, unknown>,
    jobs: { status: string; file_name: string; id: string; error?: string | null }[],
  ): QualityIssue[] => {
    const list: QualityIssue[] = []

    const totalNodes = (graphRaw.total_nodes as number) ?? 0
    const totalEdges = (graphRaw.total_relationships as number) ?? 0
    const labels     = (graphRaw.node_labels as Record<string, number>) ?? {}
    const relTypes   = (graphRaw.relationship_types as Record<string, number>) ?? {}
    const docCount   = labels.Document ?? 0

    // ── Graph checks ──────────────────────────────────────────────────────────
    if (totalNodes === 0) {
      list.push({
        id: 'empty-graph', category: 'Graph', severity: 'critical',
        title: 'Empty knowledge graph',
        detail: 'No nodes found. Upload and process documents to build the graph.',
        fixed: false,
      })
    } else {
      if (totalEdges === 0) {
        list.push({
          id: 'no-edges', category: 'Graph', severity: 'critical',
          title: 'No relationships in graph',
          detail: 'Nodes exist but no edges were extracted. Check the ingestion pipeline configuration.',
          fixed: false,
        })
      } else {
        const ratio = totalEdges / totalNodes
        if (ratio < 0.5) {
          list.push({
            id: 'low-density', category: 'Graph', severity: 'warning',
            title: 'Low graph density',
            detail: `Only ${ratio.toFixed(2)} edges per node. A healthy graph typically has >1 edge/node.`,
            fix: 'Re-process documents with relationship extraction enabled.',
            fixed: false,
          })
        }
      }

      if (docCount === 0 && totalNodes > 0) {
        list.push({
          id: 'no-docs', category: 'Graph', severity: 'warning',
          title: 'Nodes without source documents',
          detail: 'Graph has nodes but no Document nodes. Provenance tracking is missing.',
          fixed: false,
        })
      }

      // Orphan check: nodes with no relationships
      const entityCount = Object.values(labels).reduce((a, b) => a + b, 0)
      const relCount    = Object.values(relTypes).reduce((a, b) => a + b, 0)
      if (entityCount > 100 && relCount < entityCount * 0.1) {
        list.push({
          id: 'orphan-nodes', category: 'Graph', severity: 'warning',
          title: 'Possible orphan nodes',
          detail: `${entityCount} entity nodes but only ${relCount} relationships detected. Many nodes may be isolated.`,
          fix: 'Re-run the relationship extraction step on source documents.',
          fixed: false,
        })
      }
    }

    // ── Ingestion checks ──────────────────────────────────────────────────────
    const failedJobs = jobs.filter(j => j.status === 'failed')
    failedJobs.forEach(job => {
      list.push({
        id:       `failed-job-${job.id}`,
        category: 'Ingestion',
        severity: 'critical',
        title:    `Failed ingestion: ${job.file_name}`,
        detail:   job.error ?? 'No error detail available.',
        fix:      'Delete and re-upload the file, or check the ingestion service logs.',
        fixAction: async () => {
          await ingestionApi.deleteJob(job.id)
        },
        fixed: false,
      })
    })

    const pendingJobs = jobs.filter(j => j.status === 'processing' || j.status === 'pending')
    if (pendingJobs.length > 3) {
      list.push({
        id: 'stalled-jobs', category: 'Ingestion', severity: 'warning',
        title: `${pendingJobs.length} jobs stuck in processing`,
        detail: 'Multiple jobs remain in processing/pending state. The pipeline may be stalled.',
        fix:    'Restart the ingestion service container.',
        fixed:  false,
      })
    }

    // ── Data coverage checks ──────────────────────────────────────────────────
    if (totalNodes > 0 && totalNodes < 50) {
      list.push({
        id: 'low-coverage', category: 'Coverage', severity: 'info',
        title: 'Low data coverage',
        detail: `Only ${totalNodes} nodes in the graph. Import more documents to improve coverage.`,
        fixed: false,
      })
    }

    if (list.length === 0) {
      list.push({
        id: 'all-good', category: 'System', severity: 'info',
        title: 'No issues detected',
        detail: 'Your knowledge graph and ingestion pipeline look healthy.',
        fixed: true,
      })
    }

    return list
  }, [])

  const loadIssues = useCallback(async () => {
    setLoading(true)
    try {
      const [gRes, jRes] = await Promise.allSettled([
        graphHttp.get<Record<string, unknown>>('/api/graph/stats', { timeout: 8_000 }),
        ingestHttp.get<{ jobs: { status: string; file_name: string; id: string; error?: string | null }[]; total: number }>('/api/ingestion/jobs', { timeout: 8_000 }),
      ])
      const graphRaw = gRes.status === 'fulfilled' ? gRes.value.data : {}
      const jobs     = jRes.status === 'fulfilled' ? (jRes.value.data.jobs ?? []) : []
      const found    = buildIssues(graphRaw, jobs)
      setIssues(found)

      // Score: start at 100, deduct per issue
      const deductions = { critical: 25, warning: 10, info: 2 }
      const sc = Math.max(0, 100 - found
        .filter(i => !i.fixed)
        .reduce((a, i) => a + (deductions[i.severity] ?? 0), 0))
      setScore(sc)
    } finally {
      setLoading(false)
    }
  }, [buildIssues])

  useEffect(() => { loadIssues() }, [loadIssues])

  const handleFix = async (issue: QualityIssue) => {
    if (!issue.fixAction) return
    setFixing(issue.id)
    try {
      await issue.fixAction()
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, fixed: true } : i))
    } finally {
      setFixing(null)
    }
  }

  const clearAllGraph = async () => {
    setFixing('clear-graph')
    setClearMsg(null)
    try {
      const { data } = await graphApi.clearAll()
      const n = data.nodes_deleted ?? 0
      setClearMsg(n > 0 ? `Graph cleared — ${n} nodes deleted.` : 'Graph is already empty.')
      await loadIssues()
      setTimeout(() => setClearMsg(null), 4000)
    } catch {
      setClearMsg('Failed to clear graph. Check that the graph service is running.')
      setTimeout(() => setClearMsg(null), 5000)
    } finally {
      setFixing(null)
    }
  }

  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'
  const scoreBar   = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const critCount  = issues.filter(i => i.severity === 'critical' && !i.fixed).length
  const warnCount  = issues.filter(i => i.severity === 'warning'  && !i.fixed).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-cg-txt">Data Quality</h1>
          <p className="text-xs text-cg-muted">Detect and fix issues in your knowledge graph and ingestion pipeline</p>
        </div>
        <button
          onClick={loadIssues}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cg-border text-sm text-cg-muted
            hover:bg-cg-s2 hover:text-cg-txt transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Score + summary */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="xl:col-span-1">
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-cg-border" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
                  className={scoreColor}
                  strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-cg-txt">Quality Score</p>
              <p className="text-xs text-cg-muted">out of 100</p>
            </div>
            <div className="w-full h-1.5 bg-cg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${scoreBar}`} style={{ width: `${score}%` }} />
            </div>
          </div>
        </Card>

        <div className="xl:col-span-3 grid grid-cols-3 gap-4">
          {[
            { label: 'Critical issues', value: critCount,  color: 'text-red-500',    icon: <XCircle    size={20}/> },
            { label: 'Warnings',        value: warnCount,  color: 'text-amber-500',  icon: <AlertTriangle size={20}/> },
            { label: 'All clear',       value: issues.filter(i => i.fixed || i.severity === 'info').length,
              color: 'text-emerald-500', icon: <CheckCircle size={20}/> },
          ].map(s => (
            <Card key={s.label}>
              <div className="p-5 flex flex-col gap-2">
                <div className={s.color}>{s.icon}</div>
                <p className={`text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</p>
                <p className="text-xs text-cg-muted">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Clear graph feedback */}
      {clearMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm ${
          clearMsg.startsWith('Failed')
            ? 'bg-red-50 border-red-400 text-red-800'
            : clearMsg.includes('already empty')
            ? 'bg-slate-50 border-slate-400 text-slate-700'
            : 'bg-emerald-50 border-emerald-400 text-emerald-800'
        }`}>
          {clearMsg.startsWith('Failed')
            ? <AlertTriangle size={14} className="shrink-0 text-red-600" />
            : clearMsg.includes('already empty')
            ? <Info size={14} className="shrink-0 text-slate-500" />
            : <CheckCircle size={14} className="shrink-0 text-emerald-600" />
          }
          {clearMsg}
        </div>
      )}

      {/* Issues list */}
      <Card title="Detected Issues" action={
        <button
          onClick={clearAllGraph}
          disabled={fixing === 'clear-graph'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            text-red-700 bg-red-50 border border-red-300
            hover:bg-red-100 transition-all disabled:opacity-50"
        >
          {fixing === 'clear-graph'
            ? <RefreshCw size={11} className="animate-spin" />
            : <Trash2 size={11} />
          }
          {fixing === 'clear-graph' ? 'Clearing…' : 'Clear graph'}
        </button>
      }>
        <div className="divide-y divide-cg-border">
          {loading && (
            <div className="px-5 py-10 text-center text-cg-faint text-sm">Analysing data…</div>
          )}
          {!loading && issues.map(issue => (
            <div
              key={issue.id}
              className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                issue.fixed ? 'opacity-40' : 'hover:bg-cg-s2'
              }`}
            >
              <div className="mt-0.5">
                {issue.fixed
                  ? <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  : <SeverityIcon sev={issue.severity} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-cg-txt">{issue.title}</p>
                  <SeverityBadge sev={issue.severity} />
                  <span className="text-[10px] text-cg-faint border border-cg-border rounded-full px-2 py-0.5">
                    {issue.category}
                  </span>
                </div>
                <p className="text-xs text-cg-muted mt-1">{issue.detail}</p>
                {issue.fix && !issue.fixed && (
                  <p className="text-xs text-cg-primary mt-1 flex items-center gap-1">
                    <ShieldCheck size={10} className="shrink-0" />
                    {issue.fix}
                  </p>
                )}
              </div>

              {issue.fixAction && !issue.fixed && (
                <button
                  onClick={() => handleFix(issue)}
                  disabled={fixing === issue.id}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                    bg-cg-primary-s text-cg-primary border border-cg-primary/20
                    hover:bg-cg-primary hover:text-white transition-all disabled:opacity-50"
                >
                  <Wrench size={11} />
                  {fixing === issue.id ? 'Fixing…' : 'Auto-fix'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

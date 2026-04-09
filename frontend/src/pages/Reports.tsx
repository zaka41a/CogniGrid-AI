import { useState } from 'react'
import { FileText, Download, Trash2, Plus, Search, BarChart2, Brain, AlertTriangle } from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

interface Report {
  id: string
  title: string
  type: 'anomaly' | 'prediction' | 'classification' | 'summary'
  status: 'ready' | 'generating' | 'failed'
  pages: number
  generatedAt: string
  size: string
}

const MOCK_REPORTS: Report[] = [
  { id: '1', title: 'Anomaly Detection — April 2026',      type: 'anomaly',        status: 'ready',      pages: 12, generatedAt: '2026-04-04', size: '1.2 MB' },
  { id: '2', title: 'Sales Prediction Q2 2026',           type: 'prediction',     status: 'ready',      pages: 8,  generatedAt: '2026-04-03', size: '890 KB' },
  { id: '3', title: 'Document Classification Summary',    type: 'classification', status: 'ready',      pages: 5,  generatedAt: '2026-04-03', size: '540 KB' },
  { id: '4', title: 'Weekly Knowledge Graph Digest',      type: 'summary',        status: 'generating', pages: 0,  generatedAt: '2026-04-04', size: '—' },
  { id: '5', title: 'Infrastructure Anomaly Report',      type: 'anomaly',        status: 'failed',     pages: 0,  generatedAt: '2026-04-02', size: '—' },
  { id: '6', title: 'Customer Behavior Predictions',      type: 'prediction',     status: 'ready',      pages: 15, generatedAt: '2026-04-01', size: '2.1 MB' },
]

const TYPE_META = {
  anomaly:        { label: 'Anomaly',        icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
  prediction:     { label: 'Prediction',     icon: BarChart2,     color: 'text-blue-400 bg-blue-500/10' },
  classification: { label: 'Classification', icon: Brain,         color: 'text-purple-400 bg-purple-500/10' },
  summary:        { label: 'Summary',        icon: FileText,      color: 'text-green-400 bg-green-500/10' },
}

const STATUS_VARIANT: Record<Report['status'], 'success' | 'warning' | 'danger'> = {
  ready:      'success',
  generating: 'warning',
  failed:     'danger',
}

export default function Reports() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_REPORTS.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-cg-txt">Reports</h2>
          <p className="text-sm text-cg-muted mt-0.5">{MOCK_REPORTS.filter(r => r.status === 'ready').length} reports ready</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold gradient-primary text-white shadow-cg hover:opacity-90 transition-all">
          <Plus size={15} />
          Generate report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(TYPE_META).map(([type, meta]) => {
          const Icon = meta.icon
          const count = MOCK_REPORTS.filter(r => r.type === type && r.status === 'ready').length
          return (
            <Card key={type}>
              <div className="px-5 py-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-xs text-cg-muted">{meta.label}</p>
                  <p className="text-xl font-bold text-cg-txt">{count}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* List */}
      <Card>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-cg-border">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-faint" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-cg-bg border border-cg-border rounded-lg pl-9 pr-3 py-2 text-sm text-cg-txt placeholder:text-cg-faint focus:outline-none focus:border-cg-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                {['Report', 'Type', 'Status', 'Pages', 'Size', 'Generated', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((report, i) => {
                const meta = TYPE_META[report.type]
                const Icon = meta.icon
                return (
                  <tr key={report.id} className={`border-b border-cg-border/50 hover:bg-cg-s2 transition-colors ${i % 2 ? 'bg-cg-stripe' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon size={13} />
                        </div>
                        <span className="text-cg-txt font-medium">{report.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-cg-muted">{meta.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={STATUS_VARIANT[report.status]}>{report.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-cg-muted text-xs font-mono">
                      {report.status === 'ready' ? report.pages : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-cg-muted text-xs">{report.size}</td>
                    <td className="px-5 py-3.5 text-cg-faint text-xs whitespace-nowrap">{report.generatedAt}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {report.status === 'ready' && (
                          <button className="p-1.5 text-cg-faint hover:text-cg-primary hover:bg-cg-primary-s rounded-lg transition-all">
                            <Download size={13} />
                          </button>
                        )}
                        <button className="p-1.5 text-cg-faint hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-cg-muted text-sm">
              No reports found.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

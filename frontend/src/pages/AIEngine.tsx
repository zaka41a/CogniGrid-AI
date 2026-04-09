import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Card from '../components/ui/Card'
import { Badge, severityBadge } from '../components/ui/Badge'
import TabBar from '../components/ui/TabBar'
import { useChartColors } from '../hooks/useChartColors'
import { mockAnomalyRows, mockPredictionData, mockClassificationResults } from '../mock'

const TABS = [
  { key: 'anomaly',        label: 'Anomaly Detection' },
  { key: 'predictions',    label: 'Predictions'       },
  { key: 'classification', label: 'Classification'    },
]

const MODELS = ['Energy Consumption', 'Network Load', 'Sensor Failure']

export default function AIEngine() {
  const [tab, setTab]                   = useState('anomaly')
  const [modelEnabled, setModelEnabled] = useState(true)
  const [sensitivity, setSensitivity]   = useState(1)
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [classInput, setClassInput]     = useState('')
  const [classRan, setClassRan]         = useState(false)
  const { grid, tick, tooltip } = useChartColors()

  return (
    <div className="space-y-6">

      {/* Header + tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-cg-txt">AI Engine</h2>
          <p className="text-sm text-cg-muted mt-0.5">Machine learning models & predictions</p>
        </div>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* ── Anomaly Detection ── */}
      {tab === 'anomaly' && (
        <div className="space-y-5">
          <Card>
            <div className="p-5 flex flex-wrap gap-8 items-start">
              {/* Toggle */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Model Status</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModelEnabled(p => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${modelEnabled ? 'gradient-primary' : 'bg-cg-border'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${modelEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                  <span className={`text-sm font-semibold ${modelEnabled ? 'text-emerald-500' : 'text-cg-muted'}`}>
                    {modelEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Sensitivity slider */}
              <div className="space-y-2 flex-1 min-w-48">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">
                  Sensitivity —{' '}
                  <span className="text-cg-txt normal-case font-medium">{['Low', 'Medium', 'High'][sensitivity]}</span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-cg-faint">Low</span>
                  <input
                    type="range" min={0} max={2} value={sensitivity}
                    onChange={e => setSensitivity(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1.5 rounded cursor-pointer"
                  />
                  <span className="text-xs text-cg-faint">High</span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3 ml-auto">
                {[
                  { label: 'Threshold',    value: '0.75' },
                  { label: 'Model ver.',   value: 'v2.1' },
                  { label: 'Last trained', value: '2 days ago' },
                  { label: 'Accuracy',     value: '91.4%' },
                ].map(s => (
                  <div key={s.label} className="bg-cg-bg border border-cg-border rounded-lg px-3 py-2">
                    <p className="text-[10px] text-cg-faint">{s.label}</p>
                    <p className="text-sm font-semibold text-cg-txt mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Anomaly Detection Results">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cg-border">
                    {['Timestamp', 'System', 'Anomaly Score', 'Severity'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockAnomalyRows.map(row => (
                    <tr key={row.id} className="border-b border-cg-border/50 hover:bg-cg-s2 transition-colors">
                      <td className="px-5 py-3.5 text-cg-muted whitespace-nowrap font-mono text-xs">{row.timestamp}</td>
                      <td className="px-5 py-3.5 text-cg-txt font-medium">{row.system}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 h-1.5 bg-cg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${row.score * 100}%`,
                                backgroundColor: row.score > 0.75 ? '#EF4444' : row.score > 0.5 ? '#F59E0B' : '#10B981',
                              }}
                            />
                          </div>
                          <span className="text-cg-txt text-xs font-mono">{row.score.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={severityBadge(row.severity)} dot>{row.severity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Predictions ── */}
      {tab === 'predictions' && (
        <div className="space-y-5">
          <Card>
            <div className="p-5 flex flex-wrap gap-5 items-center">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Model</p>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="bg-cg-bg border border-cg-border rounded-xl text-sm text-cg-txt px-3 py-2
                    focus:outline-none focus:border-cg-primary transition-all"
                >
                  {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Confidence</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-40 h-2 bg-cg-border rounded-full overflow-hidden">
                    <div className="h-full w-[94%] gradient-primary rounded-full" />
                  </div>
                  <span className="text-cg-txt font-bold text-sm">94.2%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title={`${selectedModel} — Actual vs Predicted (24h)`}>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={mockPredictionData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="time" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltip.contentStyle} labelStyle={tooltip.labelStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: tick }} />
                  <Line type="monotone" dataKey="actual"    stroke="#6366F1" strokeWidth={2.5} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Predicted" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ── Classification ── */}
      {tab === 'classification' && (
        <div className="space-y-5">
          <Card title="Classification Input">
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">
                  Paste raw data or select dataset
                </label>
                <textarea
                  rows={5}
                  value={classInput}
                  onChange={e => setClassInput(e.target.value)}
                  placeholder="Paste sensor data JSON / CSV row here…"
                  className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-3
                    text-sm text-cg-txt placeholder:text-cg-faint font-mono
                    focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/15
                    resize-none transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setClassRan(true)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold gradient-primary text-white shadow-cg hover:opacity-90 transition-all"
                >
                  Run Classification
                </button>
                <button className="px-4 py-2 bg-cg-s2 hover:bg-cg-border text-cg-muted text-sm font-medium rounded-xl transition-all border border-cg-border">
                  Load Sample Dataset
                </button>
              </div>
            </div>
          </Card>

          {classRan && (
            <Card title="Classification Results">
              <div className="p-5 space-y-4">
                {mockClassificationResults.map((r, i) => (
                  <div key={r.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-txt font-medium">{r.label}</span>
                      <span className="text-cg-muted font-mono">{(r.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-cg-bg border border-cg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          i === 0 ? 'gradient-primary' : 'bg-cg-border'
                        }`}
                        style={{ width: `${r.confidence * 100}%`, transitionDelay: `${i * 100}ms` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-cg-border">
                  <p className="text-xs text-cg-muted">
                    Top class: <span className="text-cg-txt font-semibold">{mockClassificationResults[0].label}</span>
                    <span className="text-cg-faint ml-2">({(mockClassificationResults[0].confidence * 100).toFixed(1)}% confidence)</span>
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

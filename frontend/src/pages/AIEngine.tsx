import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Card from '../components/ui/Card'
import Badge, { severityVariant } from '../components/ui/Badge'
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
  const [tab, setTab] = useState('anomaly')
  const [modelEnabled, setModelEnabled] = useState(true)
  const [sensitivity, setSensitivity] = useState(1)
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [classInput, setClassInput] = useState('')
  const [classRan, setClassRan] = useState(false)
  const { grid, tick, tooltip } = useChartColors()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-cg-txt">AI Engine</h2>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* ── Anomaly Detection ── */}
      {tab === 'anomaly' && (
        <div className="space-y-5">
          <Card>
            <div className="p-5 flex flex-wrap gap-8 items-start">
              {/* Toggle */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Model Status</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModelEnabled((p) => !p)}
                    className={`w-11 h-6 rounded-full transition-all relative ${modelEnabled ? 'bg-gradient-to-r from-blue-500 to-green-500' : 'bg-cg-border'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${modelEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                  <span className={`text-sm font-medium ${modelEnabled ? 'text-green-400' : 'text-cg-muted'}`}>
                    {modelEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Sensitivity */}
              <div className="space-y-2 flex-1 min-w-48">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">
                  Sensitivity — <span className="text-cg-txt normal-case font-medium">{['Low', 'Medium', 'High'][sensitivity]}</span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-cg-faint">Low</span>
                  <input
                    type="range" min={0} max={2} value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="flex-1 accent-blue-500 h-1.5 rounded"
                  />
                  <span className="text-xs text-cg-faint">High</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Anomaly Detection Results">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cg-border">
                    {['Timestamp', 'System', 'Anomaly Score', 'Severity'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockAnomalyRows.map((row, i) => (
                    <tr key={row.id} className={`border-b border-cg-border/50 hover:bg-cg-s2 transition-colors ${i % 2 ? 'bg-cg-stripe' : ''}`}>
                      <td className="px-5 py-3.5 text-cg-muted whitespace-nowrap font-mono text-xs">{row.timestamp}</td>
                      <td className="px-5 py-3.5 text-cg-txt">{row.system}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 h-1.5 bg-cg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${row.score * 100}%`,
                                backgroundColor: row.score > 0.75 ? '#EF4444' : row.score > 0.5 ? '#F59E0B' : '#22C55E',
                              }}
                            />
                          </div>
                          <span className="text-cg-txt text-xs font-mono">{row.score.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={severityVariant(row.severity)}>{row.severity}</Badge>
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
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Confidence Score</p>
                <div className="flex items-center gap-2">
                  <div className="w-40 h-2 bg-cg-border rounded-full overflow-hidden">
                    <div className="h-full w-[94%] bg-gradient-to-r from-blue-500 to-green-400 rounded-full" />
                  </div>
                  <span className="text-cg-txt font-semibold text-sm">94.2%</span>
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
                  <Tooltip
                    contentStyle={tooltip.contentStyle}
                    labelStyle={tooltip.labelStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
                  <Line type="monotone" dataKey="actual"    stroke="#3B82F6" strokeWidth={2.5} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="predicted" stroke="#22C55E" strokeWidth={2}   dot={false} strokeDasharray="5 3" name="Predicted" />
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
                <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Paste raw data or select dataset</label>
                <textarea
                  rows={5}
                  value={classInput}
                  onChange={(e) => setClassInput(e.target.value)}
                  placeholder="Paste sensor data JSON / CSV row here..."
                  className="w-full bg-cg-bg border border-cg-border rounded-lg px-4 py-3 text-sm text-cg-txt placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setClassRan(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Run Classification
                </button>
                <button className="px-4 py-2 bg-cg-s2 hover:bg-cg-border text-cg-muted text-sm font-medium rounded-lg transition-colors border border-cg-border">
                  Load Sample Dataset
                </button>
              </div>
            </div>
          </Card>

          {classRan && (
            <Card title="Classification Results">
              <div className="p-5 space-y-4">
                {mockClassificationResults.map((r) => (
                  <div key={r.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-cg-txt font-medium">{r.label}</span>
                      <span className="text-cg-muted font-mono">{(r.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-cg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500"
                        style={{ width: `${r.confidence * 100}%` }}
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

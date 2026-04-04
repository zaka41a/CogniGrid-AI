import { useState } from 'react'
import Card from '../components/ui/Card'
import TabBar from '../components/ui/TabBar'
import { mockAIModels, mockRBACRoles } from '../mock'

const TABS = [
  { key: 'general',      label: 'General'      },
  { key: 'models',       label: 'AI Models'    },
  { key: 'integrations', label: 'Integrations' },
  { key: 'security',     label: 'Security'     },
]

const TIMEZONES = ['UTC', 'UTC+1 (CET)', 'UTC+2 (EET)', 'UTC-5 (EST)', 'UTC-8 (PST)']
const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Arabic']

const INTEGRATION_LIST = [
  { name: 'Apache Kafka',   desc: 'Real-time streaming data ingestion', connected: true,  icon: '⚡' },
  { name: 'Apache Jena',    desc: 'RDF triple store & SPARQL engine',   connected: true,  icon: '🔗' },
  { name: 'Elasticsearch',  desc: 'Log and event search backend',       connected: false, icon: '🔍' },
  { name: 'Grafana',        desc: 'Metrics visualization & dashboards', connected: false, icon: '📊' },
  { name: 'AWS S3',         desc: 'Object storage for data exports',    connected: true,  icon: '☁️' },
]

const PERMISSION_LABELS: Record<string, string> = {
  viewDashboard:    'View Dashboard',
  manageUsers:      'Manage Users',
  importData:       'Import Data',
  runModels:        'Run Models',
  editSettings:     'Edit Settings',
  acknowledgeAlerts:'Acknowledge Alerts',
  viewGraph:        'View Knowledge Graph',
}

export default function Settings() {
  const [tab, setTab] = useState('general')
  const [platformName, setPlatformName] = useState('CogniGrid AI')
  const [timezone, setTimezone] = useState('UTC')
  const [language, setLanguage] = useState('English')
  const [models, setModels] = useState(mockAIModels)
  const [saved, setSaved] = useState(false)

  const toggleModel = (id: string) =>
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m))

  const setThreshold = (id: string, val: number) =>
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, threshold: val } : m))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-cg-txt">Settings</h2>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {/* ── General ── */}
      {tab === 'general' && (
        <Card title="General Settings">
          <div className="p-6 space-y-6 max-w-lg">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Platform Name</label>
              <input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full bg-cg-bg border border-cg-border rounded-lg px-4 py-2.5 text-sm text-cg-txt focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-cg-bg border border-cg-border rounded-lg px-4 py-2.5 text-sm text-cg-txt focus:outline-none focus:border-blue-500"
              >
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-cg-muted uppercase tracking-wide">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-cg-bg border border-cg-border rounded-lg px-4 py-2.5 text-sm text-cg-txt focus:outline-none focus:border-blue-500"
              >
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                saved ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>
        </Card>
      )}

      {/* ── AI Models ── */}
      {tab === 'models' && (
        <Card title="Configured AI Models">
          <div className="divide-y divide-cg-border">
            {models.map((model) => (
              <div key={model.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-cg-txt">{model.name}</p>
                    <span className="px-2 py-0.5 text-[10px] bg-cg-s2 text-cg-muted rounded border border-cg-border">
                      {model.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="space-y-1 min-w-40">
                    <p className="text-xs text-cg-muted">Threshold — <span className="text-cg-txt">{model.threshold.toFixed(2)}</span></p>
                    <input
                      type="range" min={0} max={1} step={0.05} value={model.threshold}
                      onChange={(e) => setThreshold(model.id, Number(e.target.value))}
                      className="w-full accent-blue-500 h-1.5"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleModel(model.id)}
                      className={`w-11 h-6 rounded-full transition-all relative ${model.enabled ? 'bg-gradient-to-r from-blue-500 to-green-500' : 'bg-cg-border'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${model.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className={`text-xs font-medium ${model.enabled ? 'text-green-400' : 'text-cg-faint'}`}>
                      {model.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Integrations ── */}
      {tab === 'integrations' && (
        <Card title="Integrations">
          <div className="divide-y divide-cg-border">
            {INTEGRATION_LIST.map((int) => (
              <div key={int.name} className="px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-cg-s2 border border-cg-border flex items-center justify-center text-lg flex-shrink-0">
                  {int.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cg-txt">{int.name}</p>
                  <p className="text-xs text-cg-muted">{int.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${int.connected ? 'text-green-400' : 'text-cg-faint'}`}>
                    {int.connected ? 'Connected' : 'Not connected'}
                  </span>
                  <button className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    int.connected
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                      : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                  }`}>
                    {int.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Security / RBAC ── */}
      {tab === 'security' && (
        <Card title="Role-Based Access Control">
          <div className="overflow-x-auto p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cg-border">
                  <th className="text-left py-3 pr-6 text-xs font-semibold text-cg-muted">Permission</th>
                  {mockRBACRoles.map((r) => (
                    <th key={r.role} className="text-center px-4 py-3 text-xs font-semibold text-cg-txt">{r.role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(PERMISSION_LABELS).map((perm, i) => (
                  <tr key={perm} className={`border-b border-cg-border/50 ${i % 2 ? 'bg-cg-stripe' : ''}`}>
                    <td className="py-3.5 pr-6 text-cg-muted text-xs whitespace-nowrap">
                      {PERMISSION_LABELS[perm]}
                    </td>
                    {mockRBACRoles.map((r) => (
                      <td key={r.role} className="text-center px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={r.permissions[perm] ?? false}
                          readOnly
                          className="w-3.5 h-3.5 accent-blue-500 cursor-default"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

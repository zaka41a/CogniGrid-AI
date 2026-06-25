import { useState, useMemo, useCallback } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position, MarkerType,
  type Node, type Edge, type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { parse, stringify } from 'yaml'
import { Factory, Plug, Building2, Plus, Trash2, X, SlidersHorizontal } from 'lucide-react'

type Doc = Record<string, any>
type Section = 'units' | 'demand' | 'markets'
interface Selected { section: Section; key: string }

const INPUT = 'w-full bg-cg-bg border border-cg-border rounded-lg px-2.5 py-1.5 text-xs text-cg-txt focus:outline-none focus:border-cg-primary'

const UNIT_DEFAULT = {
  technology: 'power_plant', unit_operator: 'operator_1', fuel_type: 'natural gas',
  emission_factor: 0.4, max_power: 100, min_power: 0, efficiency: 0.5,
  bidding_strategies: { EOM: 'NaiveSingleBidStrategy' },
}
const DEMAND_DEFAULT = { technology: 'demand', unit_operator: 'demand', max_power: 500, min_power: 0 }

function safeParse(yamlStr: string): Doc {
  try {
    const d = parse(yamlStr)
    return d && typeof d === 'object' ? d : {}
  } catch {
    return {}
  }
}

function UnitNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border-2 bg-white px-3 py-2 shadow-sm min-w-[150px] ${selected ? 'border-emerald-500' : 'border-emerald-500/40'}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <Factory size={13} className="text-emerald-600" />{data.label}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </div>
  )
}
function DemandNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border-2 bg-white px-3 py-2 shadow-sm min-w-[150px] ${selected ? 'border-blue-500' : 'border-blue-500/40'}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <Plug size={13} className="text-blue-600" />{data.label}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle type="source" position={Position.Left} className="!bg-blue-500" />
    </div>
  )
}
function MarketNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border-2 bg-indigo-50 px-4 py-3 shadow min-w-[160px] text-center ${selected ? 'border-indigo-500' : 'border-indigo-500/50'}`}>
      <Handle id="from-units" type="target" position={Position.Left} className="!bg-indigo-500" />
      <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800">
        <Building2 size={14} className="text-indigo-600" />{data.label}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle id="from-demand" type="target" position={Position.Right} className="!bg-indigo-500" />
    </div>
  )
}
const nodeTypes = { unit: UnitNode, demand: DemandNode, market: MarketNode }
const MINIMAP_COLOR: Record<string, string> = { unit: '#10B981', demand: '#3B82F6', market: '#6366F1' }

export default function VisualBuilder({ yaml, onChange }: { yaml: string; onChange: (y: string) => void }) {
  const [doc, setDoc] = useState<Doc>(() => safeParse(yaml))
  const [sel, setSel] = useState<Selected | null>(null)

  const commit = useCallback((next: Doc) => {
    setDoc(next)
    onChange(stringify(next))
  }, [onChange])

  const marketKeys = Object.keys(doc.markets ?? {})
  const hubMarket = marketKeys[0]
  const hubId = hubMarket ? `market:${hubMarket}` : null

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = []
    Object.entries<any>(doc.units ?? {}).forEach(([k, v], i) => out.push({
      id: `units:${k}`, type: 'unit', position: { x: 40, y: 40 + i * 110 },
      data: { label: k, sub: `${v?.fuel_type ?? v?.technology ?? 'unit'} · ${v?.max_power ?? '?'} MW` },
      selected: sel?.section === 'units' && sel.key === k,
    }))
    marketKeys.forEach((k, i) => out.push({
      id: `market:${k}`, type: 'market', position: { x: 430, y: 90 + i * 150 },
      data: { label: k, sub: doc.markets[k]?.product ?? 'market' },
      selected: sel?.section === 'markets' && sel.key === k,
    }))
    Object.entries<any>(doc.demand ?? {}).forEach(([k, v], i) => out.push({
      id: `demand:${k}`, type: 'demand', position: { x: 820, y: 40 + i * 110 },
      data: { label: k, sub: `demand · ${v?.max_power ?? '?'} MW` },
      selected: sel?.section === 'demand' && sel.key === k,
    }))
    return out
  }, [doc, sel, marketKeys])

  const edges = useMemo<Edge[]>(() => {
    if (!hubId) return []
    const out: Edge[] = []
    Object.keys(doc.units ?? {}).forEach(k => out.push({
      id: `e-u-${k}`, source: `units:${k}`, target: hubId, targetHandle: 'from-units',
      animated: true, style: { stroke: '#10B981', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' },
    }))
    Object.keys(doc.demand ?? {}).forEach(k => out.push({
      id: `e-d-${k}`, source: `demand:${k}`, target: hubId, targetHandle: 'from-demand',
      animated: true, style: { stroke: '#3B82F6', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
    }))
    return out
  }, [doc, hubId])

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const [section, key] = node.id.split(/:(.+)/)
    setSel({ section: section as Section, key })
  }, [])

  const uniqueKey = (section: string, base: string) => {
    const existing = doc[section] ?? {}
    let n = 1
    while (`${base}_${n}` in existing) n++
    return `${base}_${n}`
  }
  const addUnit = () => {
    const key = uniqueKey('units', 'unit')
    commit({ ...doc, units: { ...(doc.units ?? {}), [key]: { ...UNIT_DEFAULT } } })
    setSel({ section: 'units', key })
  }
  const addDemand = () => {
    const key = uniqueKey('demand', 'demand')
    commit({ ...doc, demand: { ...(doc.demand ?? {}), [key]: { ...DEMAND_DEFAULT } } })
    setSel({ section: 'demand', key })
  }
  const removeEntity = (section: Section, key: string) => {
    const sect = { ...(doc[section] ?? {}) }
    delete sect[key]
    commit({ ...doc, [section]: sect })
    setSel(null)
  }
  const setField = (section: Section, key: string, field: string, value: unknown) => {
    const sect = { ...(doc[section] ?? {}) }
    sect[key] = { ...(sect[key] ?? {}), [field]: value }
    commit({ ...doc, [section]: sect })
  }
  const setGeneral = (field: string, value: unknown) =>
    commit({ ...doc, general: { ...(doc.general ?? {}), [field]: value } })
  const setBidding = (key: string, value: string) =>
    setField('units', key, 'bidding_strategies', { [hubMarket ?? 'EOM']: value })
  const renameEntity = (section: Section, oldKey: string, newKey: string) => {
    const clean = newKey.trim()
    if (!clean || clean === oldKey || (doc[section] ?? {})[clean]) return
    const entries = Object.entries(doc[section] ?? {}).map(([k, v]) => (k === oldKey ? [clean, v] : [k, v]))
    commit({ ...doc, [section]: Object.fromEntries(entries) })
    setSel({ section, key: clean })
  }

  const general = doc.general ?? {}
  const selEntity = sel ? (doc[sel.section] ?? {})[sel.key] : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-cg-border bg-cg-surface p-3">
        <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5 text-xs font-semibold text-cg-muted">
          <SlidersHorizontal size={13} className="text-cg-primary" /> General
        </div>
        <Field label="Scenario name">
          <input value={general.scenario_name ?? ''} onChange={e => setGeneral('scenario_name', e.target.value)} className={INPUT} />
        </Field>
        <Field label="Start date">
          <input value={general.start_date ?? ''} onChange={e => setGeneral('start_date', e.target.value)} className={INPUT} />
        </Field>
        <Field label="End date">
          <input value={general.end_date ?? ''} onChange={e => setGeneral('end_date', e.target.value)} className={INPUT} />
        </Field>
        <Field label="Time step">
          <input value={general.time_step ?? ''} onChange={e => setGeneral('time_step', e.target.value)} className={INPUT} />
        </Field>
      </div>

      <div className="flex gap-3 h-[58vh]">
        <div className="flex-1 rounded-xl border border-cg-border overflow-hidden bg-cg-bg relative">
          <div className="absolute z-10 top-2 left-2 flex gap-2">
            <button onClick={addUnit} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white shadow hover:opacity-90">
              <Plus size={12} /> Power plant
            </button>
            <button onClick={addDemand} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500 text-white shadow hover:opacity-90">
              <Plus size={12} /> Demand
            </button>
          </div>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView proOptions={{ hideAttribution: true }}>
            <Background color="#cbd5e1" gap={18} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={n => MINIMAP_COLOR[n.type ?? 'unit'] ?? '#94a3b8'} maskColor="rgba(148,163,184,0.15)" />
          </ReactFlow>
        </div>

        <div className="w-72 shrink-0 rounded-xl border border-cg-border bg-cg-surface p-3 overflow-y-auto">
          {!sel || !selEntity ? (
            <p className="text-xs text-cg-faint">Select a node to edit its properties, or add a power plant / demand.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cg-faint">{sel.section.slice(0, -1)}</span>
                <button onClick={() => setSel(null)} className="text-cg-faint hover:text-cg-txt"><X size={13} /></button>
              </div>

              <Field label="Name">
                <input key={sel.key} defaultValue={sel.key} onBlur={e => renameEntity(sel.section, sel.key, e.target.value)} className={INPUT} />
              </Field>

              {sel.section === 'units' && (
                <>
                  <Field label="Technology">
                    <input value={selEntity.technology ?? ''} onChange={e => setField('units', sel.key, 'technology', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Fuel type">
                    <input value={selEntity.fuel_type ?? ''} onChange={e => setField('units', sel.key, 'fuel_type', e.target.value)} className={INPUT} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Max power"><input type="number" value={selEntity.max_power ?? 0} onChange={e => setField('units', sel.key, 'max_power', Number(e.target.value))} className={INPUT} /></Field>
                    <Field label="Min power"><input type="number" value={selEntity.min_power ?? 0} onChange={e => setField('units', sel.key, 'min_power', Number(e.target.value))} className={INPUT} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Efficiency"><input type="number" step="0.01" value={selEntity.efficiency ?? 0} onChange={e => setField('units', sel.key, 'efficiency', Number(e.target.value))} className={INPUT} /></Field>
                    <Field label="Emission"><input type="number" step="0.01" value={selEntity.emission_factor ?? 0} onChange={e => setField('units', sel.key, 'emission_factor', Number(e.target.value))} className={INPUT} /></Field>
                  </div>
                  <Field label="Bidding strategy">
                    <select value={selEntity.bidding_strategies?.[hubMarket ?? 'EOM'] ?? 'NaiveSingleBidStrategy'} onChange={e => setBidding(sel.key, e.target.value)} className={INPUT}>
                      <option>NaiveSingleBidStrategy</option>
                      <option>flexable_eom</option>
                      <option>flexable_eom_block</option>
                    </select>
                  </Field>
                </>
              )}

              {sel.section === 'demand' && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Max power"><input type="number" value={selEntity.max_power ?? 0} onChange={e => setField('demand', sel.key, 'max_power', Number(e.target.value))} className={INPUT} /></Field>
                  <Field label="Min power"><input type="number" value={selEntity.min_power ?? 0} onChange={e => setField('demand', sel.key, 'min_power', Number(e.target.value))} className={INPUT} /></Field>
                </div>
              )}

              {sel.section === 'markets' && (
                <Field label="Product">
                  <input value={selEntity.product ?? ''} onChange={e => setField('markets', sel.key, 'product', e.target.value)} className={INPUT} />
                </Field>
              )}

              {sel.section !== 'markets' && (
                <button onClick={() => removeEntity(sel.section, sel.key)} className="flex items-center gap-1.5 text-[11px] font-semibold text-cg-danger hover:underline">
                  <Trash2 size={12} /> Delete {sel.section.slice(0, -1)}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-cg-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

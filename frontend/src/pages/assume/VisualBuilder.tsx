import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position, MarkerType, useNodesState,
  type Node, type Edge, type NodeProps, type NodeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { parse, stringify } from 'yaml'
import { Factory, Plug, Building2, BatteryCharging, Plus, Trash2, X, SlidersHorizontal, Maximize2, Minimize2 } from 'lucide-react'

type Doc = Record<string, any>
type XY = { x: number; y: number }
type Section = 'units' | 'demand' | 'markets' | 'storage_units'
interface Selected { section: Section; key: string }

const INPUT = 'w-full bg-cg-bg border border-cg-border rounded-lg px-2.5 py-1.5 text-xs text-cg-txt focus:outline-none focus:border-cg-primary'

const UNIT_DEFAULT = {
  technology: 'power_plant', unit_operator: 'operator_1', fuel_type: 'natural gas',
  emission_factor: 0.4, max_power: 100, min_power: 0, efficiency: 0.5, additional_cost: 0,
  bidding_strategies: { EOM: 'NaiveSingleBidStrategy' },
}
const STORAGE_DEFAULT = {
  technology: 'storage', unit_operator: 'storage_op',
  max_power_charge: 100, max_power_discharge: 100, max_soc: 400,
  efficiency_charge: 0.95, efficiency_discharge: 0.95, additional_cost: 1, emission_factor: 0,
  bidding_strategies: { EOM: 'flexable_eom_storage' },
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
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Factory size={13} className="text-emerald-600" />{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </div>
  )
}
function StorageNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border-2 bg-white px-3 py-2 shadow-sm min-w-[150px] ${selected ? 'border-amber-500' : 'border-amber-500/40'}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><BatteryCharging size={13} className="text-amber-600" />{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </div>
  )
}
function DemandNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border-2 bg-white px-3 py-2 shadow-sm min-w-[150px] ${selected ? 'border-blue-500' : 'border-blue-500/40'}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Plug size={13} className="text-blue-600" />{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle type="source" position={Position.Left} className="!bg-blue-500" />
    </div>
  )
}
function MarketNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-xl border-2 bg-indigo-50 px-4 py-3 shadow min-w-[160px] text-center ${selected ? 'border-indigo-500' : 'border-indigo-500/50'}`}>
      <Handle id="from-units" type="target" position={Position.Left} className="!bg-indigo-500" />
      <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800"><Building2 size={14} className="text-indigo-600" />{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{data.sub}</div>
      <Handle id="from-demand" type="target" position={Position.Right} className="!bg-indigo-500" />
    </div>
  )
}
const nodeTypes = { unit: UnitNode, storage: StorageNode, demand: DemandNode, market: MarketNode }
const MINIMAP_COLOR: Record<string, string> = { unit: '#10B981', storage: '#F59E0B', demand: '#3B82F6', market: '#6366F1' }

function buildNodes(doc: Doc, sel: Selected | null, pos: Record<string, XY>): Node[] {
  const out: Node[] = []
  const at = (id: string, def: XY) => pos[id] ?? def
  const units = Object.entries<any>(doc.units ?? {})
  const storage = Object.entries<any>(doc.storage_units ?? {})
  const demand = Object.entries<any>(doc.demand ?? {})
  units.forEach(([k, v], i) => {
    const id = `units:${k}`
    out.push({ id, type: 'unit', position: at(id, { x: 40, y: 40 + i * 110 }),
      data: { label: k, sub: `${v?.fuel_type ?? v?.technology ?? 'unit'} · ${v?.max_power ?? '?'} MW` },
      selected: sel?.section === 'units' && sel.key === k })
  })
  storage.forEach(([k, v], i) => {
    const id = `storage_units:${k}`
    out.push({ id, type: 'storage', position: at(id, { x: 40, y: 40 + (units.length + i) * 110 }),
      data: { label: k, sub: `storage · ${v?.max_power_discharge ?? v?.max_power_charge ?? '?'} MW` },
      selected: sel?.section === 'storage_units' && sel.key === k })
  })
  Object.keys(doc.markets ?? {}).forEach((k, i) => {
    const id = `markets:${k}`
    out.push({ id, type: 'market', position: at(id, { x: 470, y: 120 + i * 160 }),
      data: { label: k, sub: doc.markets[k]?.product ?? 'market' },
      selected: sel?.section === 'markets' && sel.key === k })
  })
  demand.forEach(([k, v], i) => {
    const id = `demand:${k}`
    out.push({ id, type: 'demand', position: at(id, { x: 880, y: 40 + i * 110 }),
      data: { label: k, sub: `demand · ${v?.max_power ?? '?'} MW` },
      selected: sel?.section === 'demand' && sel.key === k })
  })
  return out
}

function buildEdges(doc: Doc): Edge[] {
  const market = Object.keys(doc.markets ?? {})[0]
  if (!market) return []
  const hub = `markets:${market}`
  const out: Edge[] = []
  const link = (section: string, color: string, handle: string) => (k: string) => out.push({
    id: `e-${section}-${k}`, source: `${section}:${k}`, target: hub, targetHandle: handle,
    animated: true, style: { stroke: color, strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color },
  })
  Object.keys(doc.units ?? {}).forEach(link('units', '#10B981', 'from-units'))
  Object.keys(doc.storage_units ?? {}).forEach(link('storage_units', '#F59E0B', 'from-units'))
  Object.keys(doc.demand ?? {}).forEach(link('demand', '#3B82F6', 'from-demand'))
  return out
}

export default function VisualBuilder({ yaml, onChange }: { yaml: string; onChange: (y: string) => void }) {
  const [doc, setDoc] = useState<Doc>(() => safeParse(yaml))
  const [sel, setSel] = useState<Selected | null>(null)
  const [full, setFull] = useState(false)
  const posRef = useRef<Record<string, XY>>({})
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(doc, null, posRef.current))

  useEffect(() => { setNodes(buildNodes(doc, sel, posRef.current)) }, [doc, sel, setNodes])
  useEffect(() => {
    if (!full) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [full])

  const edges = useMemo(() => buildEdges(doc), [doc])
  const hubMarket = Object.keys(doc.markets ?? {})[0]

  const commit = useCallback((next: Doc) => { setDoc(next); onChange(stringify(next)) }, [onChange])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    changes.forEach(c => { if (c.type === 'position' && c.position) posRef.current[c.id] = c.position })
  }, [onNodesChange])

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
  const addEntity = (section: Section, base: string, template: object) => {
    const key = uniqueKey(section, base)
    commit({ ...doc, [section]: { ...(doc[section] ?? {}), [key]: { ...template } } })
    setSel({ section, key })
  }
  const removeEntity = (section: Section, key: string) => {
    const sect = { ...(doc[section] ?? {}) }
    delete sect[key]
    delete posRef.current[`${section}:${key}`]
    commit({ ...doc, [section]: sect })
    setSel(null)
  }
  const setField = (section: Section, key: string, field: string, value: unknown) => {
    const sect = { ...(doc[section] ?? {}) }
    sect[key] = { ...(sect[key] ?? {}), [field]: value }
    commit({ ...doc, [section]: sect })
  }
  const setGeneral = (field: string, value: unknown) => commit({ ...doc, general: { ...(doc.general ?? {}), [field]: value } })
  const setBidding = (section: Section, key: string, value: string) => setField(section, key, 'bidding_strategies', { [hubMarket ?? 'EOM']: value })
  const renameEntity = (section: Section, oldKey: string, newKey: string) => {
    const clean = newKey.trim()
    if (!clean || clean === oldKey || (doc[section] ?? {})[clean]) return
    const entries = Object.entries(doc[section] ?? {}).map(([k, v]) => (k === oldKey ? [clean, v] : [k, v]))
    commit({ ...doc, [section]: Object.fromEntries(entries) })
    setSel({ section, key: clean })
  }

  const general = doc.general ?? {}
  const selEntity = sel ? (doc[sel.section] ?? {})[sel.key] : null
  const num = (section: Section, key: string, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setField(section, key, field, Number(e.target.value))

  return (
    <div className={full ? 'fixed inset-0 z-50 bg-cg-bg p-4 flex flex-col gap-3' : 'space-y-3'}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-cg-border bg-cg-surface p-3 shrink-0">
        <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5 text-xs font-semibold text-cg-muted">
          <SlidersHorizontal size={13} className="text-cg-primary" /> General
        </div>
        <Field label="Scenario name"><input value={general.scenario_name ?? ''} onChange={e => setGeneral('scenario_name', e.target.value)} className={INPUT} /></Field>
        <Field label="Start date"><input value={general.start_date ?? ''} onChange={e => setGeneral('start_date', e.target.value)} className={INPUT} /></Field>
        <Field label="End date"><input value={general.end_date ?? ''} onChange={e => setGeneral('end_date', e.target.value)} className={INPUT} /></Field>
        <Field label="Time step"><input value={general.time_step ?? ''} onChange={e => setGeneral('time_step', e.target.value)} className={INPUT} /></Field>
      </div>

      <div className={full ? 'flex gap-3 flex-1 min-h-0' : 'flex gap-3 h-[58vh]'}>
        <div className="flex-1 rounded-xl border border-cg-border overflow-hidden bg-cg-bg relative">
          <div className="absolute z-10 top-2 left-2 flex gap-2">
            <button onClick={() => addEntity('units', 'unit', UNIT_DEFAULT)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white shadow hover:opacity-90"><Plus size={12} /> Power plant</button>
            <button onClick={() => addEntity('storage_units', 'storage', STORAGE_DEFAULT)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500 text-white shadow hover:opacity-90"><Plus size={12} /> Storage</button>
            <button onClick={() => addEntity('demand', 'demand', DEMAND_DEFAULT)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500 text-white shadow hover:opacity-90"><Plus size={12} /> Demand</button>
          </div>
          <button onClick={() => setFull(f => !f)} className="absolute z-10 top-2 right-2 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-cg-surface border border-cg-border text-cg-txt shadow hover:bg-cg-s2">
            {full ? <Minimize2 size={12} /> : <Maximize2 size={12} />}{full ? 'Exit' : 'Fullscreen'}
          </button>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={handleNodesChange} onNodeClick={onNodeClick} fitView proOptions={{ hideAttribution: true }}>
            <Background color="#cbd5e1" gap={18} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={n => MINIMAP_COLOR[n.type ?? 'unit'] ?? '#94a3b8'} maskColor="rgba(148,163,184,0.15)" />
          </ReactFlow>
        </div>

        <div className="w-72 shrink-0 rounded-xl border border-cg-border bg-cg-surface p-3 overflow-y-auto">
          {!sel || !selEntity ? (
            <p className="text-xs text-cg-faint">Select a node to edit its properties, or add a power plant, storage or demand.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cg-faint">{sel.section === 'storage_units' ? 'storage' : sel.section.slice(0, -1)}</span>
                <button onClick={() => setSel(null)} className="text-cg-faint hover:text-cg-txt"><X size={13} /></button>
              </div>

              <Field label="Name"><input key={sel.key} defaultValue={sel.key} onBlur={e => renameEntity(sel.section, sel.key, e.target.value)} className={INPUT} /></Field>
              <Field label="Operator"><input value={selEntity.unit_operator ?? ''} onChange={e => setField(sel.section, sel.key, 'unit_operator', e.target.value)} className={INPUT} /></Field>

              {sel.section === 'units' && (
                <>
                  <Field label="Technology"><input value={selEntity.technology ?? ''} onChange={e => setField('units', sel.key, 'technology', e.target.value)} className={INPUT} /></Field>
                  <Field label="Fuel type"><input value={selEntity.fuel_type ?? ''} onChange={e => setField('units', sel.key, 'fuel_type', e.target.value)} className={INPUT} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Max power"><input type="number" value={selEntity.max_power ?? 0} onChange={num('units', sel.key, 'max_power')} className={INPUT} /></Field>
                    <Field label="Min power"><input type="number" value={selEntity.min_power ?? 0} onChange={num('units', sel.key, 'min_power')} className={INPUT} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Efficiency"><input type="number" step="0.01" value={selEntity.efficiency ?? 0} onChange={num('units', sel.key, 'efficiency')} className={INPUT} /></Field>
                    <Field label="Emission"><input type="number" step="0.01" value={selEntity.emission_factor ?? 0} onChange={num('units', sel.key, 'emission_factor')} className={INPUT} /></Field>
                  </div>
                  <Field label="Marginal cost (EUR/MWh)"><input type="number" step="0.1" value={selEntity.additional_cost ?? 0} onChange={num('units', sel.key, 'additional_cost')} className={INPUT} /></Field>
                  <Field label="Bidding strategy">
                    <select value={selEntity.bidding_strategies?.[hubMarket ?? 'EOM'] ?? 'NaiveSingleBidStrategy'} onChange={e => setBidding('units', sel.key, e.target.value)} className={INPUT}>
                      <option>NaiveSingleBidStrategy</option><option>flexable_eom</option><option>flexable_eom_block</option>
                    </select>
                  </Field>
                </>
              )}

              {sel.section === 'storage_units' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Max charge"><input type="number" value={selEntity.max_power_charge ?? 0} onChange={num('storage_units', sel.key, 'max_power_charge')} className={INPUT} /></Field>
                    <Field label="Max discharge"><input type="number" value={selEntity.max_power_discharge ?? 0} onChange={num('storage_units', sel.key, 'max_power_discharge')} className={INPUT} /></Field>
                  </div>
                  <Field label="Max SoC (MWh)"><input type="number" value={selEntity.max_soc ?? 0} onChange={num('storage_units', sel.key, 'max_soc')} className={INPUT} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Eff. charge"><input type="number" step="0.01" value={selEntity.efficiency_charge ?? 0} onChange={num('storage_units', sel.key, 'efficiency_charge')} className={INPUT} /></Field>
                    <Field label="Eff. discharge"><input type="number" step="0.01" value={selEntity.efficiency_discharge ?? 0} onChange={num('storage_units', sel.key, 'efficiency_discharge')} className={INPUT} /></Field>
                  </div>
                  <Field label="Additional cost (EUR/MWh)"><input type="number" step="0.1" value={selEntity.additional_cost ?? 0} onChange={num('storage_units', sel.key, 'additional_cost')} className={INPUT} /></Field>
                  <Field label="Bidding strategy">
                    <select value={selEntity.bidding_strategies?.[hubMarket ?? 'EOM'] ?? 'flexable_eom_storage'} onChange={e => setBidding('storage_units', sel.key, e.target.value)} className={INPUT}>
                      <option>flexable_eom_storage</option><option>naive_eom</option>
                    </select>
                  </Field>
                </>
              )}

              {sel.section === 'demand' && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Max power"><input type="number" value={selEntity.max_power ?? 0} onChange={num('demand', sel.key, 'max_power')} className={INPUT} /></Field>
                  <Field label="Min power"><input type="number" value={selEntity.min_power ?? 0} onChange={num('demand', sel.key, 'min_power')} className={INPUT} /></Field>
                </div>
              )}

              {sel.section === 'markets' && (
                <Field label="Product"><input value={selEntity.product ?? ''} onChange={e => setField('markets', sel.key, 'product', e.target.value)} className={INPUT} /></Field>
              )}

              {sel.section !== 'markets' && (
                <button onClick={() => removeEntity(sel.section, sel.key)} className="flex items-center gap-1.5 text-[11px] font-semibold text-cg-danger hover:underline">
                  <Trash2 size={12} /> Delete node
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

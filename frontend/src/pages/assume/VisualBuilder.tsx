import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position, MarkerType, useNodesState,
  type Node, type Edge, type NodeProps, type NodeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { parse, stringify } from 'yaml'
import { Factory, Plug, Building2, BatteryCharging, Users, Plus, Trash2, X, SlidersHorizontal, Maximize2, Minimize2, LayoutGrid, Undo2, Redo2, AlertTriangle, Copy } from 'lucide-react'

type Doc = Record<string, any>
type XY = { x: number; y: number }
type Section = 'units' | 'storage_units' | 'demand'
type Sel = { kind: 'op'; name: string } | { kind: 'ent'; section: Section; key: string } | null

const INPUT = 'w-full bg-cg-bg border border-cg-border rounded-lg px-2.5 py-1.5 text-xs text-cg-txt focus:outline-none focus:border-cg-primary'
const OP_COLORS = ['#6366F1', '#0EA5E9', '#14B8A6', '#F59E0B', '#EC4899', '#84CC16', '#A855F7', '#EF4444']
const SECTIONS: Section[] = ['units', 'storage_units', 'demand']
const CHILD_W = 196
const CHILD_H = 56
const HEAD_H = 46
const CONT_W = 232

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
const DEMAND_DEFAULT = { technology: 'demand', unit_operator: 'consumer', max_power: 500, min_power: 0 }

function safeParse(yamlStr: string): Doc {
  try {
    const d = parse(yamlStr)
    return d && typeof d === 'object' ? d : {}
  } catch {
    return {}
  }
}

function operatorOf(v: any): string {
  const op = v?.unit_operator
  return typeof op === 'string' && op.trim() ? op : 'unassigned'
}
function deriveOps(doc: Doc): string[] {
  const set: string[] = []
  for (const s of SECTIONS)
    for (const v of Object.values<any>(doc[s] ?? {})) {
      const op = operatorOf(v)
      if (!set.includes(op)) set.push(op)
    }
  return set
}
function membersOf(doc: Doc, op: string) {
  const res: { section: Section; key: string; v: any }[] = []
  for (const section of SECTIONS)
    for (const [key, v] of Object.entries<any>(doc[section] ?? {}))
      if (operatorOf(v) === op) res.push({ section, key, v })
  return res
}

function entityIssue(section: Section, v: any): string | null {
  const eff = (x: any) => x != null && (x <= 0 || x > 1)
  if (section === 'demand') {
    if (!(Number(v?.max_power) > 0)) return 'Max power must be greater than 0'
    if ((Number(v?.min_power) || 0) > (Number(v?.max_power) || 0)) return 'Min power exceeds max power'
    return null
  }
  if (section === 'storage_units') {
    if (!(Number(v?.max_power_charge) > 0) && !(Number(v?.max_power_discharge) > 0)) return 'Charge or discharge power must be greater than 0'
    if (!(Number(v?.max_soc) > 0)) return 'Max SoC must be greater than 0'
    if (eff(v?.efficiency_charge) || eff(v?.efficiency_discharge)) return 'Efficiency must be between 0 and 1'
    return null
  }
  if (!(Number(v?.max_power) > 0)) return 'Max power must be greater than 0'
  if ((Number(v?.min_power) || 0) > (Number(v?.max_power) || 0)) return 'Min power exceeds max power'
  if (eff(v?.efficiency)) return 'Efficiency must be between 0 and 1'
  return null
}

function computeKpis(doc: Doc) {
  const units = Object.values<any>(doc.units ?? {})
  const storage = Object.values<any>(doc.storage_units ?? {})
  const demand = Object.values<any>(doc.demand ?? {})
  const supply = units.reduce((s, u) => s + (Number(u?.max_power) || 0), 0)
    + storage.reduce((s, u) => s + (Number(u?.max_power_discharge) || 0), 0)
  const dem = demand.reduce((s, u) => s + (Number(u?.max_power) || 0), 0)
  const margin = dem > 0 ? ((supply - dem) / dem) * 100 : null
  let issues = 0
  for (const sec of SECTIONS)
    for (const v of Object.values<any>(doc[sec] ?? {}))
      if (entityIssue(sec, v)) issues++
  return { supply, demand: dem, margin, units: units.length, storage: storage.length, demandCount: demand.length, issues }
}

function ChildBody({ icon, label, sub, color, selected, invalid, issue }: { icon: React.ReactNode; label: string; sub: string; color: string; selected: boolean; invalid?: boolean; issue?: string }) {
  const border = invalid ? '#EF4444' : (selected ? color : color + '55')
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm h-full relative" style={{ border: `2px solid ${border}` }}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">{icon}{label}</div>
      <div className="text-[9px] text-slate-500 mt-0.5 truncate">{sub}</div>
      {invalid && (
        <span title={issue} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow">
          <AlertTriangle size={9} />
        </span>
      )}
    </div>
  )
}
const UnitNode = ({ data, selected }: NodeProps) => <ChildBody icon={<Factory size={11} className="text-emerald-600" />} label={data.label} sub={data.sub} color="#10B981" selected={!!selected} invalid={data.invalid} issue={data.issue} />
const StorageNode = ({ data, selected }: NodeProps) => <ChildBody icon={<BatteryCharging size={11} className="text-amber-600" />} label={data.label} sub={data.sub} color="#F59E0B" selected={!!selected} invalid={data.invalid} issue={data.issue} />
const DemandNode = ({ data, selected }: NodeProps) => <ChildBody icon={<Plug size={11} className="text-blue-600" />} label={data.label} sub={data.sub} color="#3B82F6" selected={!!selected} invalid={data.invalid} issue={data.issue} />

function OperatorNode({ data, selected }: NodeProps) {
  return (
    <div className="h-full w-full rounded-2xl bg-slate-50/80 backdrop-blur-sm" style={{ border: `2px solid ${selected ? data.color : data.color + '66'}` }}>
      <div className="flex items-center gap-1.5 px-3 h-9 rounded-t-2xl text-[11px] font-bold text-white" style={{ background: data.color }}>
        <Users size={12} />{data.label}
        {data.issues > 0 && (
          <span className="ml-1 flex items-center gap-0.5 text-[9px] bg-red-500 rounded-full px-1.5 py-0.5"><AlertTriangle size={8} />{data.issues}</span>
        )}
        <span className="ml-auto font-normal opacity-80">{data.count}</span>
      </div>
      <Handle type="source" position={data.side === 'demand' ? Position.Left : Position.Right} className="!w-2.5 !h-2.5" style={{ background: data.color }} />
    </div>
  )
}
function MarketNode({ data, selected }: NodeProps) {
  return (
    <div className={`rounded-2xl border-2 bg-indigo-50 px-4 py-3 shadow min-w-[180px] ${selected ? 'border-indigo-500' : 'border-indigo-500/50'}`}>
      <Handle id="from-supply" type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-emerald-500" />
      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Building2 size={14} className="text-indigo-600" />{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">operator: {data.operator}</div>
      <div className="flex flex-wrap gap-1 mt-2">
        {data.products.map((p: string, i: number) => (
          <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">{p}</span>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">
        <span className="text-emerald-600">supply</span><span className="text-blue-600">demand</span>
      </div>
      <Handle id="from-demand" type="target" position={Position.Right} className="!w-2.5 !h-2.5 !bg-blue-500" />
    </div>
  )
}
const nodeTypes = { operator: OperatorNode, unit: UnitNode, storage: StorageNode, demand: DemandNode, market: MarketNode }
const MINIMAP_COLOR: Record<string, string> = { operator: '#64748b', unit: '#10B981', storage: '#F59E0B', demand: '#3B82F6', market: '#6366F1' }
const childType: Record<Section, string> = { units: 'unit', storage_units: 'storage', demand: 'demand' }

function productChips(doc: Doc, market: string): string[] {
  const prods = doc.markets?.[market]?.products
  if (!Array.isArray(prods)) return []
  return prods.map((p: any) => `${p?.count ?? '?'}x ${p?.duration ?? '1h'}`)
}

function isDemandOp(doc: Doc, op: string): boolean {
  const m = membersOf(doc, op)
  return m.length > 0 && m.every(x => x.section === 'demand')
}

function buildGraph(doc: Doc, ops: string[], sel: Sel, pos: Record<string, XY>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const colorOf = (i: number) => OP_COLORS[i % OP_COLORS.length]
  const LEFT_X = 20, MARKET_X = 460, RIGHT_X = 760
  const market = Object.keys(doc.markets ?? {})[0]
  let yL = 20, yR = 20

  ops.forEach((op, i) => {
    const members = membersOf(doc, op)
    const height = HEAD_H + Math.max(members.length, 1) * (CHILD_H + 10) + 12
    const demand = isDemandOp(doc, op)
    const opId = `op:${op}`
    const def = demand ? { x: RIGHT_X, y: yR } : { x: LEFT_X, y: yL }
    if (demand) yR += height + 24; else yL += height + 24
    const p = pos[opId] ?? def
    const opIssues = members.filter(m => entityIssue(m.section, m.v)).length
    nodes.push({
      id: opId, type: 'operator', position: p, draggable: true,
      style: { width: CONT_W, height }, data: { label: op, color: colorOf(i), count: members.length, side: demand ? 'demand' : 'supply', issues: opIssues },
      selected: sel?.kind === 'op' && sel.name === op,
    })
    members.forEach((m, j) => {
      const id = `${m.section}:${m.key}`
      const rel = pos[id] ?? { x: 18, y: HEAD_H + j * (CHILD_H + 10) }
      const sub = m.section === 'units' ? `${m.v?.fuel_type ?? 'unit'} . ${m.v?.max_power ?? '?'} MW`
        : m.section === 'storage_units' ? `storage . ${m.v?.max_power_discharge ?? '?'} MW`
        : `demand . ${m.v?.max_power ?? '?'} MW`
      const issue = entityIssue(m.section, m.v)
      nodes.push({
        id, type: childType[m.section], parentId: opId, extent: 'parent',
        position: rel, draggable: true, style: { width: CHILD_W, height: CHILD_H },
        data: { label: m.key, sub, invalid: !!issue, issue: issue ?? undefined },
        selected: sel?.kind === 'ent' && sel.section === m.section && sel.key === m.key,
      })
    })
    if (market) edges.push({
      id: `e-${op}`, source: opId, target: `market:${market}`, targetHandle: demand ? 'from-demand' : 'from-supply',
      animated: true, style: { stroke: colorOf(i), strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: colorOf(i) },
    })
  })

  Object.keys(doc.markets ?? {}).forEach((k, i) => {
    const id = `market:${k}`
    nodes.push({
      id, type: 'market', position: pos[id] ?? { x: MARKET_X, y: 80 + i * 220 }, draggable: true,
      data: { label: k, operator: doc.markets[k]?.operator ?? k, products: productChips(doc, k) },
      selected: sel?.kind === 'ent' && sel.section === ('markets' as Section) && sel.key === k,
    })
  })
  return { nodes, edges }
}

export default function VisualBuilder({ yaml, onChange }: { yaml: string; onChange: (y: string) => void }) {
  const [doc, setDoc] = useState<Doc>(() => safeParse(yaml))
  const [extraOps, setExtraOps] = useState<string[]>([])
  const [sel, setSel] = useState<Sel>(null)
  const [full, setFull] = useState(false)
  const [past, setPast] = useState<Doc[]>([])
  const [future, setFuture] = useState<Doc[]>([])
  const posRef = useRef<Record<string, XY>>({})

  const ops = useMemo(() => {
    const derived = deriveOps(doc)
    const extras = extraOps.filter(o => !derived.includes(o) && sel?.kind === 'op' && sel.name === o)
    const all = [...derived, ...extras]
    return all.filter((o, i) => all.indexOf(o) === i)
  }, [doc, extraOps, sel])

  const graph = useMemo(() => buildGraph(doc, ops, sel, posRef.current), [doc, ops, sel])
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)

  useEffect(() => { setNodes(graph.nodes) }, [graph, setNodes])
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setFull(false) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFull = useCallback(() => {
    setFull(prev => {
      const next = !prev
      try {
        if (next) document.documentElement.requestFullscreen?.()
        else if (document.fullscreenElement) document.exitFullscreen?.()
      } catch { /* fall back to the portal overlay */ }
      return next
    })
  }, [])

  const commit = (next: Doc) => {
    setPast(p => [...p, doc].slice(-50))
    setFuture([])
    setDoc(next)
    onChange(stringify(next))
  }
  const undo = () => {
    if (!past.length) return
    const prev = past[past.length - 1]
    setPast(past.slice(0, -1))
    setFuture(f => [doc, ...f])
    setDoc(prev)
    onChange(stringify(prev))
    setSel(null)
  }
  const redo = () => {
    if (!future.length) return
    const nxt = future[0]
    setFuture(future.slice(1))
    setPast(p => [...p, doc])
    setDoc(nxt)
    onChange(stringify(nxt))
    setSel(null)
  }
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    changes.forEach(c => { if (c.type === 'position' && c.position) posRef.current[c.id] = c.position })
  }, [onNodesChange])

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === 'operator') setSel({ kind: 'op', name: node.id.slice(3) })
    else if (node.type === 'market') setSel({ kind: 'ent', section: 'markets' as Section, key: node.id.slice(7) })
    else {
      const [section, key] = node.id.split(/:(.+)/)
      setSel({ kind: 'ent', section: section as Section, key })
    }
  }, [])

  const uniqueKey = (section: string, base: string) => {
    const existing = doc[section] ?? {}
    let n = 1
    while (`${base}_${n}` in existing) n++
    return `${base}_${n}`
  }
  const uniqueOp = () => {
    let n = 1
    while (ops.includes(`operator_${n}`)) n++
    return `operator_${n}`
  }
  const targetOperator = () => {
    if (sel?.kind === 'op') return sel.name
    if (sel?.kind === 'ent' && sel.section !== ('markets' as Section)) return operatorOf((doc[sel.section] ?? {})[sel.key])
    return ops[0] ?? 'operator_1'
  }
  const addOperator = () => {
    const name = uniqueOp()
    setExtraOps(prev => [...prev, name])
    setSel({ kind: 'op', name })
  }
  const addEntity = (section: Section, base: string, template: object) => {
    const key = uniqueKey(section, base)
    const op = targetOperator()
    commit({ ...doc, [section]: { ...(doc[section] ?? {}), [key]: { ...template, unit_operator: op } } })
    setSel({ kind: 'ent', section, key })
  }
  const removeEntity = (section: Section, key: string) => {
    const sect = { ...(doc[section] ?? {}) }
    delete sect[key]
    delete posRef.current[`${section}:${key}`]
    commit({ ...doc, [section]: sect })
    setSel(null)
  }
  const duplicateEntity = (section: Section, key: string) => {
    const src = (doc[section] ?? {})[key]
    if (!src) return
    const base = key.replace(/_\d+$/, '') || section.slice(0, -1)
    const newKey = uniqueKey(section, base)
    commit({ ...doc, [section]: { ...(doc[section] ?? {}), [newKey]: { ...src } } })
    setSel({ kind: 'ent', section, key: newKey })
  }
  const setField = (section: Section, key: string, field: string, value: unknown) => {
    const sect = { ...(doc[section] ?? {}) }
    sect[key] = { ...(sect[key] ?? {}), [field]: value }
    commit({ ...doc, [section]: sect })
  }
  const setGeneral = (field: string, value: unknown) => commit({ ...doc, general: { ...(doc.general ?? {}), [field]: value } })
  const setMarketField = (mkt: string, field: string, value: unknown) =>
    commit({ ...doc, markets: { ...doc.markets, [mkt]: { ...(doc.markets?.[mkt] ?? {}), [field]: value } } })
  const setMarketProduct = (mkt: string, field: string, value: unknown) => {
    const m = { ...(doc.markets?.[mkt] ?? {}) }
    const list = Array.isArray(m.products) && m.products.length ? m.products : [{ duration: '1h', count: 24, first_delivery: '0h' }]
    m.products = list.map((p: any, i: number) => (i === 0 ? { ...p, [field]: value } : p))
    commit({ ...doc, markets: { ...doc.markets, [mkt]: m } })
  }
  const setBidding = (section: Section, key: string, value: string) => setField(section, key, 'bidding_strategies', { [Object.keys(doc.markets ?? {})[0] ?? 'EOM']: value })
  const renameEntity = (section: Section, oldKey: string, newKey: string) => {
    const clean = newKey.trim()
    if (!clean || clean === oldKey || (doc[section] ?? {})[clean]) return
    const entries = Object.entries(doc[section] ?? {}).map(([k, v]) => (k === oldKey ? [clean, v] : [k, v]))
    commit({ ...doc, [section]: Object.fromEntries(entries) })
    setSel({ kind: 'ent', section, key: clean })
  }
  const renameOperator = (oldName: string, newName: string) => {
    const clean = newName.trim()
    if (!clean || clean === oldName) return
    const next: Doc = { ...doc }
    for (const s of SECTIONS) {
      const sect = { ...(next[s] ?? {}) }
      let touched = false
      for (const [k, v] of Object.entries<any>(sect))
        if (operatorOf(v) === oldName) { sect[k] = { ...v, unit_operator: clean }; touched = true }
      if (touched) next[s] = sect
    }
    setExtraOps(prev => prev.map(o => (o === oldName ? clean : o)))
    commit(next)
    setSel({ kind: 'op', name: clean })
  }
  const removeOperator = (name: string) => {
    const next: Doc = { ...doc }
    for (const s of SECTIONS) {
      const sect = { ...(next[s] ?? {}) }
      for (const [k, v] of Object.entries<any>(sect)) if (operatorOf(v) === name) delete sect[k]
      next[s] = sect
    }
    setExtraOps(prev => prev.filter(o => o !== name))
    commit(next)
    setSel(null)
  }

  const tidy = () => {
    posRef.current = {}
    setNodes(buildGraph(doc, ops, sel, posRef.current).nodes)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        if (typing) return
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        if (typing) return
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        if (typing) return
        e.preventDefault()
        if (sel?.kind === 'ent' && (sel.section as string) !== 'markets') duplicateEntity(sel.section, sel.key)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typing || !sel) return
        e.preventDefault()
        if (sel.kind === 'op') removeOperator(sel.name)
        else if (sel.kind === 'ent' && (sel.section as string) !== 'markets') removeEntity(sel.section, sel.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, doc, past, future])

  const general = doc.general ?? {}
  const markets = Object.keys(doc.markets ?? {})
  const kpis = computeKpis(doc)
  const num = (section: Section, key: string, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value)
    setField(section, key, field, Number.isFinite(n) ? n : 0)
  }
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur() }

  const ent = sel?.kind === 'ent' ? (doc[sel.section] ?? {})[sel.key] : null

  const body = (
    <div className={full ? 'fixed inset-0 z-[100] bg-cg-bg p-4 flex flex-col gap-3 overflow-auto' : 'space-y-3'}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-cg-border bg-cg-surface p-3 shrink-0">
        <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5 text-xs font-semibold text-cg-muted"><SlidersHorizontal size={13} className="text-cg-primary" /> General</div>
        <Field label="Scenario name"><input value={general.scenario_name ?? ''} onChange={e => setGeneral('scenario_name', e.target.value)} className={INPUT} /></Field>
        <Field label="Start date"><input value={general.start_date ?? ''} onChange={e => setGeneral('start_date', e.target.value)} className={INPUT} /></Field>
        <Field label="End date"><input value={general.end_date ?? ''} onChange={e => setGeneral('end_date', e.target.value)} className={INPUT} /></Field>
        <Field label="Time step"><input value={general.time_step ?? ''} onChange={e => setGeneral('time_step', e.target.value)} className={INPUT} /></Field>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Kpi label="Supply" value={`${Math.round(kpis.supply)} MW`} tone="emerald" />
        <Kpi label="Demand" value={`${Math.round(kpis.demand)} MW`} tone="blue" />
        <Kpi label="Reserve margin" value={kpis.margin == null ? 'n/a' : `${kpis.margin >= 0 ? '+' : ''}${kpis.margin.toFixed(0)}%`} tone={kpis.margin == null || kpis.margin >= 0 ? 'emerald' : 'red'} />
        <Kpi label="Units" value={`${kpis.units} gen · ${kpis.storage} stor · ${kpis.demandCount} dem`} tone="slate" />
        <Kpi label="Issues" value={String(kpis.issues)} tone={kpis.issues > 0 ? 'red' : 'slate'} />
      </div>

      <div className={full ? 'flex gap-3 flex-1 min-h-0' : 'flex gap-3 h-[60vh]'}>
        <div className="flex-1 rounded-xl border border-cg-border overflow-hidden bg-cg-bg relative">
          <div className="absolute z-10 top-2 left-2 flex flex-wrap gap-2">
            <button onClick={addOperator} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-700 text-white shadow hover:opacity-90"><Plus size={12} /> Operator</button>
            <button onClick={() => addEntity('units', 'unit', UNIT_DEFAULT)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white shadow hover:opacity-90"><Plus size={12} /> Power plant</button>
            <button onClick={() => addEntity('storage_units', 'storage', STORAGE_DEFAULT)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500 text-white shadow hover:opacity-90"><Plus size={12} /> Storage</button>
            <button onClick={() => addEntity('demand', 'demand', DEMAND_DEFAULT)} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500 text-white shadow hover:opacity-90"><Plus size={12} /> Demand</button>
          </div>
          <div className="absolute z-10 top-2 right-2 flex items-center gap-2">
            <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)" className="flex items-center justify-center w-8 h-8 rounded-lg bg-cg-surface border border-cg-border text-cg-txt shadow hover:bg-cg-s2 disabled:opacity-40">
              <Undo2 size={13} />
            </button>
            <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)" className="flex items-center justify-center w-8 h-8 rounded-lg bg-cg-surface border border-cg-border text-cg-txt shadow hover:bg-cg-s2 disabled:opacity-40">
              <Redo2 size={13} />
            </button>
            <button onClick={tidy} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-cg-surface border border-cg-border text-cg-txt shadow hover:bg-cg-s2">
              <LayoutGrid size={12} /> Tidy
            </button>
            <button onClick={toggleFull} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-cg-surface border border-cg-border text-cg-txt shadow hover:bg-cg-s2">
              {full ? <Minimize2 size={12} /> : <Maximize2 size={12} />}{full ? 'Exit' : 'Fullscreen'}
            </button>
          </div>
          <ReactFlow nodes={nodes} edges={graph.edges} nodeTypes={nodeTypes} onNodesChange={handleNodesChange} onNodeClick={onNodeClick} fitView snapToGrid snapGrid={[16, 16]} proOptions={{ hideAttribution: true }}>
            <Background color="#cbd5e1" gap={18} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={n => MINIMAP_COLOR[n.type ?? 'unit'] ?? '#94a3b8'} maskColor="rgba(148,163,184,0.15)" />
          </ReactFlow>
          {nodes.length === 0 && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
              <p className="text-sm text-cg-faint text-center max-w-xs">Empty scenario. Use the toolbar above to add an operator, power plant, storage or demand.</p>
            </div>
          )}
        </div>

        <div className="w-72 shrink-0 rounded-xl border border-cg-border bg-cg-surface p-3 overflow-y-auto">
          {sel?.kind === 'op' ? (
            <div className="space-y-3">
              <PanelHead label="operator" onClose={() => setSel(null)} />
              <Field label="Operator name"><input key={sel.name} defaultValue={sel.name} onBlur={e => renameOperator(sel.name, e.target.value)} onKeyDown={blurOnEnter} className={INPUT} /></Field>
              <p className="text-[11px] text-cg-faint">{membersOf(doc, sel.name).length} unit(s). Use the toolbar to add a node into this operator.</p>
              <button onClick={() => removeOperator(sel.name)} className="flex items-center gap-1.5 text-[11px] font-semibold text-cg-danger hover:underline"><Trash2 size={12} /> Delete operator and its nodes</button>
            </div>
          ) : sel?.kind === 'ent' && (sel.section as string) === 'markets' && doc.markets?.[sel.key] ? (
            <div className="space-y-3">
              <PanelHead label="market" onClose={() => setSel(null)} />
              <Field label="Operator"><input value={doc.markets[sel.key].operator ?? ''} onChange={e => setMarketField(sel.key, 'operator', e.target.value)} className={INPUT} /></Field>
              <Field label="Product"><input value={doc.markets[sel.key].product ?? ''} onChange={e => setMarketField(sel.key, 'product', e.target.value)} className={INPUT} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Product duration"><input value={doc.markets[sel.key].products?.[0]?.duration ?? '1h'} onChange={e => setMarketProduct(sel.key, 'duration', e.target.value)} className={INPUT} /></Field>
                <Field label="Product count"><input type="number" value={doc.markets[sel.key].products?.[0]?.count ?? 24} onChange={e => { const n = parseInt(e.target.value, 10); setMarketProduct(sel.key, 'count', Number.isFinite(n) ? n : 24) }} className={INPUT} /></Field>
              </div>
            </div>
          ) : sel?.kind === 'ent' && ent ? (
            <div className="space-y-3">
              <PanelHead label={sel.section === 'storage_units' ? 'storage' : sel.section.slice(0, -1)} onClose={() => setSel(null)} />
              <Field label="Name"><input key={sel.key} defaultValue={sel.key} onBlur={e => renameEntity(sel.section, sel.key, e.target.value)} onKeyDown={blurOnEnter} className={INPUT} /></Field>
              <Field label="Operator">
                <select value={operatorOf(ent)} onChange={e => setField(sel.section, sel.key, 'unit_operator', e.target.value)} className={INPUT}>
                  {ops.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>

              {sel.section === 'units' && (
                <>
                  <Field label="Technology"><input value={ent.technology ?? ''} onChange={e => setField('units', sel.key, 'technology', e.target.value)} className={INPUT} /></Field>
                  <Field label="Fuel type"><input value={ent.fuel_type ?? ''} onChange={e => setField('units', sel.key, 'fuel_type', e.target.value)} className={INPUT} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Max power"><input type="number" value={ent.max_power ?? 0} onChange={num('units', sel.key, 'max_power')} className={INPUT} /></Field>
                    <Field label="Min power"><input type="number" value={ent.min_power ?? 0} onChange={num('units', sel.key, 'min_power')} className={INPUT} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Efficiency"><input type="number" step="0.01" value={ent.efficiency ?? 0} onChange={num('units', sel.key, 'efficiency')} className={INPUT} /></Field>
                    <Field label="Emission"><input type="number" step="0.01" value={ent.emission_factor ?? 0} onChange={num('units', sel.key, 'emission_factor')} className={INPUT} /></Field>
                  </div>
                  <Field label="Marginal cost (EUR/MWh)"><input type="number" step="0.1" value={ent.additional_cost ?? 0} onChange={num('units', sel.key, 'additional_cost')} className={INPUT} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Start cost (EUR)"><input type="number" step="1" value={ent.start_cost ?? 0} onChange={num('units', sel.key, 'start_cost')} className={INPUT} /></Field>
                    <Field label="Fixed cost (EUR)"><input type="number" step="1" value={ent.fixed_cost ?? 0} onChange={num('units', sel.key, 'fixed_cost')} className={INPUT} /></Field>
                  </div>
                  <Field label="Bidding strategy">
                    <select value={ent.bidding_strategies?.[markets[0] ?? 'EOM'] ?? 'NaiveSingleBidStrategy'} onChange={e => setBidding('units', sel.key, e.target.value)} className={INPUT}>
                      <option>NaiveSingleBidStrategy</option><option>flexable_eom</option><option>flexable_eom_block</option>
                    </select>
                  </Field>
                </>
              )}

              {sel.section === 'storage_units' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Max charge"><input type="number" value={ent.max_power_charge ?? 0} onChange={num('storage_units', sel.key, 'max_power_charge')} className={INPUT} /></Field>
                    <Field label="Max discharge"><input type="number" value={ent.max_power_discharge ?? 0} onChange={num('storage_units', sel.key, 'max_power_discharge')} className={INPUT} /></Field>
                  </div>
                  <Field label="Max SoC (MWh)"><input type="number" value={ent.max_soc ?? 0} onChange={num('storage_units', sel.key, 'max_soc')} className={INPUT} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Eff. charge"><input type="number" step="0.01" value={ent.efficiency_charge ?? 0} onChange={num('storage_units', sel.key, 'efficiency_charge')} className={INPUT} /></Field>
                    <Field label="Eff. discharge"><input type="number" step="0.01" value={ent.efficiency_discharge ?? 0} onChange={num('storage_units', sel.key, 'efficiency_discharge')} className={INPUT} /></Field>
                  </div>
                  <Field label="Additional cost (EUR/MWh)"><input type="number" step="0.1" value={ent.additional_cost ?? 0} onChange={num('storage_units', sel.key, 'additional_cost')} className={INPUT} /></Field>
                  <Field label="Bidding strategy">
                    <select value={ent.bidding_strategies?.[markets[0] ?? 'EOM'] ?? 'flexable_eom_storage'} onChange={e => setBidding('storage_units', sel.key, e.target.value)} className={INPUT}>
                      <option>flexable_eom_storage</option><option>naive_eom</option>
                    </select>
                  </Field>
                </>
              )}

              {sel.section === 'demand' && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Max power"><input type="number" value={ent.max_power ?? 0} onChange={num('demand', sel.key, 'max_power')} className={INPUT} /></Field>
                  <Field label="Min power"><input type="number" value={ent.min_power ?? 0} onChange={num('demand', sel.key, 'min_power')} className={INPUT} /></Field>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={() => duplicateEntity(sel.section, sel.key)} className="flex items-center gap-1.5 text-[11px] font-semibold text-cg-primary hover:underline"><Copy size={12} /> Duplicate</button>
                <button onClick={() => removeEntity(sel.section, sel.key)} className="flex items-center gap-1.5 text-[11px] font-semibold text-cg-danger hover:underline"><Trash2 size={12} /> Delete node</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-cg-faint">Click an operator, a node or the market to edit it. Use the toolbar to add an operator, power plant, storage or demand.</p>
          )}
        </div>
      </div>
    </div>
  )
  return full ? createPortal(body, document.body) : body
}

function PanelHead({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-cg-faint">{label}</span>
      <button onClick={onClose} className="text-cg-faint hover:text-cg-txt"><X size={13} /></button>
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

const KPI_TONE: Record<string, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  blue:    'border-blue-500/30 bg-blue-500/10 text-blue-600',
  red:     'border-red-500/30 bg-red-500/10 text-red-600',
  slate:   'border-cg-border bg-cg-s2 text-cg-muted',
}
function Kpi({ label, value, tone }: { label: string; value: string; tone: keyof typeof KPI_TONE }) {
  return (
    <div className={`flex flex-col rounded-xl border px-3 py-1.5 ${KPI_TONE[tone]}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-sm font-bold leading-tight">{value}</span>
    </div>
  )
}

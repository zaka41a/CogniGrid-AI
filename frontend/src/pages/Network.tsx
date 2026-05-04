import { useState, useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import { Zap, GitBranch, Box, RefreshCw, Filter, Radio, AlertTriangle, Activity, Crosshair } from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { graphHttp } from '../lib/api'
import { LayoutSelector, layoutOptions, type LayoutName } from '../components/graph/LayoutSelector'
import { Minimap } from '../components/graph/Minimap'
import { registerCytoscapeExtensions } from '../components/graph/registerCytoscapeExtensions'
import { attachGraphTooltips } from '../components/graph/GraphTooltip'

registerCytoscapeExtensions()

/**
 * Map a kV value to a SCADA-style voltage gradient color.
 * Returns null if the value is missing/unparsable, so callers can fall back
 * to the type-based color.
 */
function voltageColor(voltageKv: number | null): string | null {
  if (voltageKv === null || !Number.isFinite(voltageKv)) return null
  if (voltageKv >= 380) return '#DC2626'  // red    — 380-400 kV
  if (voltageKv >= 220) return '#F97316'  // orange — 220 kV
  if (voltageKv >= 110) return '#FACC15'  // yellow — 110 kV
  if (voltageKv >= 30)  return '#84CC16'  // light green — 30-60 kV
  if (voltageKv > 0)    return '#10B981'  // green  — LV
  return null
}

function parseVoltage(props: Record<string, unknown>): number | null {
  const raw = props.voltage ?? props.nominalVoltage ?? props.kv ?? props.base_voltage ?? null
  if (raw === null || raw === undefined || raw === '') return null
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw))
  if (Number.isNaN(num)) return null
  // Normalise: if value > 1000, assume volts → divide
  return num > 1000 ? num / 1000 : num
}

// CIM entity types and their visual properties
const CIM_STYLES: Record<string, { color: string; shape: string; size: number }> = {
  SUBSTATION:        { color: '#6366F1', shape: 'rectangle', size: 36 },
  VOLTAGE_LEVEL:     { color: '#8B5CF6', shape: 'rectangle', size: 26 },
  BUSBAR:            { color: '#10B981', shape: 'ellipse',   size: 20 },
  LINE_SEGMENT:      { color: '#F59E0B', shape: 'ellipse',   size: 18 },
  TRANSFORMER:       { color: '#EF4444', shape: 'diamond',   size: 24 },
  GENERATOR:         { color: '#22D3EE', shape: 'triangle',  size: 22 },
  LOAD:              { color: '#F97316', shape: 'ellipse',   size: 18 },
  SWITCH:            { color: '#84CC16', shape: 'rectangle', size: 16 },
  TERMINAL:          { color: '#64748B', shape: 'ellipse',   size: 12 },
  CONNECTIVITY_NODE: { color: '#94A3B8', shape: 'ellipse',   size: 12 },
  BASE_VOLTAGE:      { color: '#D97706', shape: 'ellipse',   size: 14 },
  REGION:            { color: '#EC4899', shape: 'rectangle', size: 30 },
  Document:          { color: '#475569', shape: 'rectangle', size: 20 },
}

const DEFAULT_STYLE = { color: '#94A3B8', shape: 'ellipse' as const, size: 16 }

function getStyle(type: string) { return CIM_STYLES[type] ?? DEFAULT_STYLE }

interface TopoStats {
  substations: number
  lines: number
  transformers: number
  buses: number
  generators: number
  loads: number
}

const ALL_TYPES = Object.keys(CIM_STYLES)

export default function Network() {
  const cyRef      = useRef<HTMLDivElement>(null)
  const cyInstance = useRef<cytoscape.Core | null>(null)
  const tooltipDisposeRef = useRef<(() => void) | null>(null)

  const [stats, setStats]         = useState<TopoStats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(ALL_TYPES))
  const [selectedNode, setSelectedNode]   = useState<{ label: string; type: string; props: Record<string, string> } | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const [totalNodes, setTotalNodes] = useState(0)
  const [layout, setLayout] = useState<LayoutName>('dagre')
  const [showMinimap, setShowMinimap] = useState(true)
  const [colorMode, setColorMode] = useState<'type' | 'voltage'>('type')
  const [isolatedCount, setIsolatedCount] = useState(0)
  // Phase 7: highlight depth around the selected node (0 = off)
  const [highlightHops, setHighlightHops] = useState<0 | 1 | 2 | 3>(1)
  // Phase 7: animated power-flow effect on edges
  const [flowAnimation, setFlowAnimation] = useState(false)

  const loadTopology = useCallback(async (typeFilter?: Set<string>) => {
    setLoading(true)
    try {
      type RawNode = { id: string; label: string; type: string; properties: Record<string,string> }
      type RawEdge = { source: string; target: string; label: string }
      const { data } = await graphHttp.get<{ nodes: RawNode[]; edges: RawEdge[] }>('/api/graph/visualization', { params: { limit: 300 }, timeout: 8_000 })

      const active = typeFilter ?? selectedTypes
      const nodes = (data.nodes ?? [])
        .filter(n => active.has(n.type))
        .map(n => {
          const s = getStyle(n.type)
          const kv = parseVoltage(n.properties as Record<string, unknown>)
          const vColor = voltageColor(kv)
          const finalColor = colorMode === 'voltage' && vColor ? vColor : s.color
          // Append voltage / power info to the visual label as a badge
          const power = (n.properties as Record<string, unknown>).max_power ?? (n.properties as Record<string, unknown>).p_max
          const badge = kv !== null
            ? ` · ${kv}kV`
            : (typeof power === 'number' || typeof power === 'string') && String(power).length < 8
              ? ` · ${power}MW`
              : ''
          const visibleLabel = (n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label) + badge

          return {
            data: {
              id:         n.id,
              label:      visibleLabel,
              fullLabel:  n.label,
              type:       n.type,
              properties: n.properties,
              color:      finalColor,
              size:       s.size,
              kv,
            },
          }
        })

      const nodeIds = new Set(nodes.map(n => n.data.id))
      const edges = (data.edges ?? [])
        .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e, i) => ({
          data: { id: `e-${i}`, source: e.source, target: e.target, label: e.label },
        }))

      // Compute topo stats
      const nodeList = data.nodes ?? []
      setTotalNodes(nodeList.length)
      setStats({
        substations: nodeList.filter(n => n.type === 'SUBSTATION').length,
        lines:       nodeList.filter(n => n.type === 'LINE_SEGMENT').length,
        transformers:nodeList.filter(n => n.type === 'TRANSFORMER').length,
        buses:       nodeList.filter(n => n.type === 'BUSBAR').length,
        generators:  nodeList.filter(n => n.type === 'GENERATOR').length,
        loads:       nodeList.filter(n => n.type === 'LOAD').length,
      })

      initCy([...nodes, ...edges])
    } catch {
      setStats({ substations: 0, lines: 0, transformers: 0, buses: 0, generators: 0, loads: 0 })
      initCy([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes, colorMode, layout])

  const initCy = (elements: cytoscape.ElementDefinition[]) => {
    if (!cyRef.current) return
    if (cyInstance.current) cyInstance.current.destroy()

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label':            'data(label)',
            'color':            '#CBD5E1',
            'font-size':        '9px',
            'text-valign':      'bottom',
            'text-margin-y':    4,
            'width':            'data(size)',
            'height':           'data(size)',
            'border-width':     1.5,
            'border-color':     '#0F172A',
            'text-wrap':        'ellipsis',
            'text-max-width':   '80px',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node[?isolated]',
          style: {
            'border-color': '#EF4444',
            'border-width': 3,
            'border-style': 'dashed',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node:selected',
          style: { 'border-color': '#fff', 'border-width': 3 } as cytoscape.Css.Node,
        },
        {
          selector: 'edge',
          style: {
            'width':              1.2,
            'line-color':         '#1E3A5F',
            'target-arrow-color': '#1E3A5F',
            'target-arrow-shape': 'triangle',
            'curve-style':        'bezier',
            'opacity':            0.7,
          } as cytoscape.Css.Edge,
        },
        // Phase 7.1 — n-hop highlight
        { selector: '.dimmed',        style: { 'opacity': 0.12 } as cytoscape.Css.Node },
        { selector: 'node.focused',   style: { 'border-color': '#6366F1', 'border-width': 3 } as cytoscape.Css.Node },
        { selector: 'edge.focused',   style: { 'line-color': '#6366F1', 'target-arrow-color': '#6366F1', 'opacity': 1, 'width': 2 } as cytoscape.Css.Edge },
        // Phase 7.2 — animated power-flow effect (line-dash-offset is updated by the JS animation loop)
        { selector: 'edge.flow',      style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 6], 'width': 2, 'opacity': 0.95 } as cytoscape.Css.Edge },
      ],
      layout: layoutOptions(layout),
      wheelSensitivity: 0.3,
    })

    cy.on('tap', 'node', (e) => {
      const n = e.target
      setSelectedNode({ label: n.data('fullLabel'), type: n.data('type'), props: n.data('properties') ?? {} })
      setSelectedNodeId(n.id())
    })
    cy.on('tap', (e) => {
      if (e.target === cy) {
        setSelectedNode(null)
        setSelectedNodeId(null)
      }
    })

    // Flag isolated nodes (degree 0) and count them
    cy.nodes().forEach(n => {
      if (n.degree(false) === 0) n.data('isolated', true)
    })
    const isolated = cy.nodes('[?isolated]').length
    setIsolatedCount(isolated)

    // Tooltip refresh
    if (tooltipDisposeRef.current) { try { tooltipDisposeRef.current() } catch { /* ignore */ } }
    cy.one('layoutstop', () => {
      tooltipDisposeRef.current = attachGraphTooltips(cy)
    })

    cyInstance.current = cy
    setNodeCount(elements.filter(el => !el.data?.source).length)
  }

  useEffect(() => { loadTopology() }, [])

  // Re-run layout on selector change (no need to re-fetch)
  useEffect(() => {
    const cy = cyInstance.current
    if (!cy) return
    cy.layout(layoutOptions(layout)).run()
  }, [layout])

  // Cleanup tooltips on unmount
  useEffect(() => () => {
    if (tooltipDisposeRef.current) { try { tooltipDisposeRef.current() } catch { /* ignore */ } }
  }, [])

  // Phase 7.1 — apply n-hop highlight whenever selection or hop count changes.
  // `nodeCount` in the deps re-runs the effect after a fresh initCy() rebuild.
  useEffect(() => {
    const cy = cyInstance.current
    if (!cy) return
    cy.elements().removeClass('focused dimmed')
    if (!selectedNodeId || highlightHops === 0) return
    const root = cy.getElementById(selectedNodeId)
    if (root.length === 0) return
    let hood: cytoscape.Collection = root
    for (let i = 0; i < highlightHops; i++) {
      hood = hood.union(hood.neighborhood())
    }
    cy.elements().difference(hood).addClass('dimmed')
    hood.addClass('focused')
  }, [selectedNodeId, highlightHops, nodeCount])

  // Phase 7.2 — power-flow animation: cycle line-dash-offset on every edge.
  // Step is small enough to look smooth at 60ms cadence. Offset is unbounded
  // by Cytoscape so we never need to wrap.
  useEffect(() => {
    const cy = cyInstance.current
    if (!cy) return
    if (!flowAnimation) {
      cy.edges().removeClass('flow')
      cy.edges().removeStyle('line-dash-offset')
      return
    }
    cy.edges().addClass('flow')
    let offset = 0
    const id = window.setInterval(() => {
      offset -= 1.5
      cy.edges('.flow').style('line-dash-offset', offset)
    }, 60)
    return () => {
      window.clearInterval(id)
      const c = cyInstance.current
      if (c) { c.edges().removeClass('flow'); c.edges().removeStyle('line-dash-offset') }
    }
  }, [flowAnimation, nodeCount])

  const toggleType = (type: string) => {
    const next = new Set(selectedTypes)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    setSelectedTypes(next)
    loadTopology(next)
  }

  const FILTER_GROUPS = [
    { label: 'Substations', type: 'SUBSTATION',   icon: <Box size={11} /> },
    { label: 'Buses',       type: 'BUSBAR',        icon: <Radio size={11} /> },
    { label: 'Lines',       type: 'LINE_SEGMENT',  icon: <GitBranch size={11} /> },
    { label: 'Transformers',type: 'TRANSFORMER',   icon: <Zap size={11} /> },
    { label: 'Generators',  type: 'GENERATOR',     icon: <Zap size={11} /> },
    { label: 'Loads',       type: 'LOAD',          icon: <Box size={11} /> },
  ]

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <StatCard label="Substations"  value={stats ? stats.substations  : '…'} icon={<Box       size={16}/>} iconColor="#6366F1" />
        <StatCard label="Buses"        value={stats ? stats.buses        : '…'} icon={<Radio     size={16}/>} iconColor="#10B981" />
        <StatCard label="Lines"        value={stats ? stats.lines        : '…'} icon={<GitBranch size={16}/>} iconColor="#F59E0B" />
        <StatCard label="Transformers" value={stats ? stats.transformers : '…'} icon={<Zap       size={16}/>} iconColor="#EF4444" />
        <StatCard label="Generators"   value={stats ? stats.generators   : '…'} icon={<Zap       size={16}/>} iconColor="#22D3EE" />
        <StatCard label="Loads"        value={stats ? stats.loads        : '…'} icon={<Box       size={16}/>} iconColor="#F97316" />
      </div>

      {/* Topology + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        <Card title="Network Topology" className="xl:col-span-3" action={
          <div className="flex items-center gap-2">
            <LayoutSelector value={layout} onChange={setLayout} />
            <button
              onClick={() => setColorMode(m => m === 'type' ? 'voltage' : 'type')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                colorMode === 'voltage'
                  ? 'border-cg-primary/30 bg-cg-primary-s text-cg-primary'
                  : 'border-cg-border text-cg-muted hover:text-cg-txt'
              }`}
              title="Toggle voltage gradient coloring"
            >
              {colorMode === 'voltage' ? 'Color: kV' : 'Color: type'}
            </button>
            <button
              onClick={() => setFlowAnimation(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                flowAnimation
                  ? 'border-cg-primary/30 bg-cg-primary-s text-cg-primary'
                  : 'border-cg-border text-cg-muted hover:text-cg-txt'
              }`}
              title="Animate power flow direction along edges"
            >
              <Activity size={11} />
              Flow
            </button>
            <button
              onClick={() => setShowMinimap(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showMinimap ? 'text-cg-primary bg-cg-primary-s' : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2'}`}
              title="Toggle minimap"
            >
              <Box size={13} />
            </button>
            <button onClick={() => loadTopology()} disabled={loading}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            {nodeCount > 0 && (
              <span className="text-xs text-cg-faint">{nodeCount} components</span>
            )}
          </div>
        }>
          <div className="p-4 space-y-3">
            {/* Type filters + hop selector */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={12} className="text-cg-faint shrink-0" />
              {FILTER_GROUPS.map(({ label, type }) => {
                const active = selectedTypes.has(type)
                const s = getStyle(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                      active
                        ? 'border-transparent text-white'
                        : 'border-cg-border text-cg-faint hover:text-cg-muted'
                    }`}
                    style={active ? { backgroundColor: s.color } : {}}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {label}
                  </button>
                )
              })}

              <span className="ml-2 flex items-center gap-1 pl-3 border-l border-cg-border/60">
                <Crosshair size={11} className="text-cg-faint" />
                <span className="text-[10px] text-cg-faint uppercase tracking-wide mr-1">Hops</span>
                {([0, 1, 2, 3] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHighlightHops(h)}
                    title={h === 0 ? 'Disable neighborhood highlight' : `Highlight ${h}-hop neighborhood on click`}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      highlightHops === h
                        ? 'bg-cg-primary text-white'
                        : 'bg-cg-bg text-cg-muted border border-cg-border hover:text-cg-txt'
                    }`}
                  >
                    {h === 0 ? 'off' : h}
                  </button>
                ))}
              </span>
            </div>

            {/* Cytoscape canvas */}
            <div className="bg-cg-bg rounded-xl border border-cg-border/50 relative overflow-hidden" style={{ height: 460 }}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-cg-bg/80 z-10 rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-cg-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-cg-faint">Loading topology…</p>
                  </div>
                </div>
              )}
              <div ref={cyRef} className="w-full h-full" />
              <Minimap cy={cyInstance.current} visible={showMinimap && nodeCount > 0} />

              {/* Isolated components warning chip */}
              {isolatedCount > 0 && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 shadow-lg">
                  <AlertTriangle size={11} />
                  {isolatedCount} isolated
                </div>
              )}

              {/* Voltage legend (only when in voltage mode) */}
              {colorMode === 'voltage' && nodeCount > 0 && (
                <div className="absolute top-3 right-3 flex flex-col gap-1 px-3 py-2 rounded-xl text-[10px] bg-cg-bg/85 border border-cg-border backdrop-blur shadow-lg">
                  <p className="font-bold text-cg-muted uppercase tracking-wide mb-1">Voltage</p>
                  {[
                    { c: '#DC2626', l: '≥ 380 kV' },
                    { c: '#F97316', l: '220 kV'   },
                    { c: '#FACC15', l: '110 kV'   },
                    { c: '#84CC16', l: '30-60 kV' },
                    { c: '#10B981', l: 'LV'       },
                  ].map(s => (
                    <div key={s.l} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />
                      <span className="text-cg-faint">{s.l}</span>
                    </div>
                  ))}
                </div>
              )}

              {!loading && nodeCount === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                  <Zap size={32} className="text-cg-faint" />
                  <div>
                    <p className="text-sm font-semibold text-cg-muted mb-1">No CIM power grid data</p>
                    {totalNodes > 0
                      ? <p className="text-xs text-cg-faint">The graph has <span className="font-semibold text-cg-muted">{totalNodes} nodes</span> (text entities) but no CIM elements.<br />Upload a CIM/RDF XML file to see the power grid topology.</p>
                      : <p className="text-xs text-cg-faint">Upload CIM/RDF XML files to see the power grid topology.</p>
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Component Inspector */}
        <Card title="Component Detail">
          <div className="p-4 space-y-4">
            {selectedNode ? (
              <>
                <div className="p-3 rounded-xl border border-cg-border/50 bg-cg-bg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: getStyle(selectedNode.type).color }} />
                    <p className="text-sm font-semibold text-cg-txt leading-tight">{selectedNode.label}</p>
                  </div>
                  <p className="text-xs text-cg-faint">{selectedNode.type.replace(/_/g, ' ')}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">Properties</p>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {Object.entries(selectedNode.props)
                      .filter(([k, v]) => v && v !== 'None' && !['entity_id','doc_id'].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs bg-cg-bg rounded-lg px-2.5 py-1.5 border border-cg-border/50 gap-2">
                          <span className="text-cg-muted capitalize shrink-0">{k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
                          <span className="text-cg-txt font-medium truncate">{String(v)}</span>
                        </div>
                      ))}
                    {Object.entries(selectedNode.props).filter(([k,v]) => v && v !== 'None' && !['entity_id','doc_id'].includes(k)).length === 0 && (
                      <p className="text-xs text-cg-faint text-center py-4">No additional properties</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Box size={24} className="text-cg-faint" />
                <p className="text-xs text-cg-muted">Click a component to inspect it</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

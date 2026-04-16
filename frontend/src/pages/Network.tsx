import { useState, useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import { Zap, GitBranch, Box, RefreshCw, Filter, Radio } from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'

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

  const [stats, setStats]         = useState<TopoStats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(ALL_TYPES))
  const [selectedNode, setSelectedNode]   = useState<{ label: string; type: string; props: Record<string, string> } | null>(null)
  const [nodeCount, setNodeCount] = useState(0)

  const loadTopology = useCallback(async (typeFilter?: Set<string>) => {
    setLoading(true)
    try {
      const res  = await fetch('http://localhost:8002/api/graph/visualization?limit=300')
      const data = await res.json()

      const active = typeFilter ?? selectedTypes
      const nodes = (data.nodes ?? [])
        .filter((n: { type: string }) => active.has(n.type))
        .map((n: { id: string; label: string; type: string; properties: Record<string,string> }) => {
          const s = getStyle(n.type)
          return {
            data: {
              id:         n.id,
              label:      n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label,
              fullLabel:  n.label,
              type:       n.type,
              properties: n.properties,
              color:      s.color,
              size:       s.size,
            },
          }
        })

      const nodeIds = new Set(nodes.map((n: { data: { id: string } }) => n.data.id))
      const edges = (data.edges ?? [])
        .filter((e: { source: string; target: string }) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e: { source: string; target: string; label: string }, i: number) => ({
          data: { id: `e-${i}`, source: e.source, target: e.target, label: e.label },
        }))

      // Compute topo stats
      const nodeList = data.nodes ?? []
      setStats({
        substations: nodeList.filter((n: { type: string }) => n.type === 'SUBSTATION').length,
        lines:       nodeList.filter((n: { type: string }) => n.type === 'LINE_SEGMENT').length,
        transformers:nodeList.filter((n: { type: string }) => n.type === 'TRANSFORMER').length,
        buses:       nodeList.filter((n: { type: string }) => n.type === 'BUSBAR').length,
        generators:  nodeList.filter((n: { type: string }) => n.type === 'GENERATOR').length,
        loads:       nodeList.filter((n: { type: string }) => n.type === 'LOAD').length,
      })

      initCy([...nodes, ...edges])
    } catch {
      setStats({ substations: 0, lines: 0, transformers: 0, buses: 0, generators: 0, loads: 0 })
      initCy([])
    } finally {
      setLoading(false)
    }
  }, [selectedTypes])

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
      ],
      layout: {
        name:             'cose',
        animate:          true,
        animationDuration: 800,
        nodeRepulsion:    () => 8000,
        idealEdgeLength:  () => 60,
        gravity:          0.2,
        numIter:          600,
        fit:              true,
        padding:          24,
      } as cytoscape.CoseLayoutOptions,
      wheelSensitivity: 0.3,
    })

    cy.on('tap', 'node', (e) => {
      const n = e.target
      setSelectedNode({ label: n.data('fullLabel'), type: n.data('type'), props: n.data('properties') ?? {} })
    })
    cy.on('tap', (e) => { if (e.target === cy) setSelectedNode(null) })

    cyInstance.current = cy
    setNodeCount(elements.filter(el => !el.data?.source).length)
  }

  useEffect(() => { loadTopology() }, [])

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
            {/* Type filters */}
            <div className="flex flex-wrap gap-2">
              <Filter size={12} className="text-cg-faint mt-1 shrink-0" />
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
              {!loading && nodeCount === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Zap size={32} className="text-cg-faint" />
                  <p className="text-sm text-cg-muted">No network data</p>
                  <p className="text-xs text-cg-faint">Upload CIM/RDF XML files to see the power grid topology</p>
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

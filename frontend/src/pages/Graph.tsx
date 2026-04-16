import { useState, useEffect, useCallback, useRef } from 'react'
import cytoscape from 'cytoscape'
import {
  Play, Network, GitBranch, Database, Search,
  Info, RefreshCw, Download, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { graphApi } from '../lib/api'

// ── Node type → color ──────────────────────────────────────────────────────
const NODE_COLORS: Record<string, string> = {
  SUBSTATION:        '#6366F1',
  BUSBAR:            '#10B981',
  LINE_SEGMENT:      '#F59E0B',
  TRANSFORMER:       '#8B5CF6',
  GENERATOR:         '#EF4444',
  LOAD:              '#3B82F6',
  VOLTAGE_LEVEL:     '#0D9488',
  TERMINAL:          '#64748B',
  CONNECTIVITY_NODE: '#94A3B8',
  BASE_VOLTAGE:      '#D97706',
  REGION:            '#EC4899',
  Document:          '#6366F1',
  Entity:            '#94A3B8',
  default:           '#94A3B8',
}
function getColor(type: string) { return NODE_COLORS[type] ?? NODE_COLORS.default }

const MOCK_SPARQL = `SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
  FILTER(?subject = <urn:asset:EG-447>)
}
LIMIT 25`

interface NodeDetail {
  id: string; label: string; type: string
  properties: Record<string, string>
}

export default function Graph() {
  const cyRef       = useRef<HTMLDivElement>(null)
  const cyInstance  = useRef<cytoscape.Core | null>(null)

  const [stats, setStats]         = useState<{ nodeCount: number; edgeCount: number; rdfTriples: number; documentCount: number } | null>(null)
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null)
  const [searchQ, setSearchQ]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [sparql, setSparql]       = useState(MOCK_SPARQL)
  const [queryResult, setQueryResult] = useState<string | null>(null)
  const [nodeCount, setNodeCount] = useState(0)

  const fmtNum = (n: number) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000 ? n.toLocaleString() : String(n)

  // ── Init Cytoscape ──────────────────────────────────────────────────────
  const initCy = useCallback((elements: cytoscape.ElementDefinition[]) => {
    if (!cyRef.current) return
    if (cyInstance.current) cyInstance.current.destroy()

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (el) => getColor(el.data('type') as string),
            'label':            'data(label)',
            'color':            '#94A3B8',
            'font-size':        '9px',
            'text-valign':      'bottom',
            'text-margin-y':    4,
            'width':            (el) => el.data('group') === 'Document' ? 28 : 20,
            'height':           (el) => el.data('group') === 'Document' ? 28 : 20,
            'border-width':     2,
            'border-color':     '#1E293B',
            'text-max-width':   '80px',
            'text-wrap':        'ellipsis',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node:selected',
          style: {
            'border-color':  '#fff',
            'border-width':  3,
            'width':         30,
            'height':        30,
          } as cytoscape.Css.Node,
        },
        {
          selector: 'edge',
          style: {
            'width':              1.5,
            'line-color':         '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style':        'bezier',
            'label':              'data(label)',
            'font-size':          '8px',
            'color':              '#475569',
            'text-rotation':      'autorotate',
          } as cytoscape.Css.Edge,
        },
        {
          selector: 'edge:selected',
          style: { 'line-color': '#6366F1', 'target-arrow-color': '#6366F1' } as cytoscape.Css.Edge,
        },
      ],
      layout: {
        name:             'cose',
        animate:          true,
        animationDuration: 600,
        nodeRepulsion:    () => 6000,
        idealEdgeLength:  () => 80,
        edgeElasticity:   () => 100,
        gravity:          0.25,
        numIter:          500,
        fit:              true,
        padding:          30,
      } as cytoscape.CoseLayoutOptions,
      wheelSensitivity: 0.3,
    })

    cy.on('tap', 'node', (e) => {
      const node = e.target
      setSelectedNode({
        id:         node.id(),
        label:      node.data('label'),
        type:       node.data('type'),
        properties: node.data('properties') ?? {},
      })
    })

    cy.on('tap', (e) => {
      if (e.target === cy) setSelectedNode(null)
    })

    cyInstance.current = cy
    setNodeCount(elements.filter(el => !el.data?.source).length)
  }, [])

  // ── Load graph data ─────────────────────────────────────────────────────
  const loadGraph = useCallback(async (query?: string) => {
    setLoading(true)
    try {
      const [statsRes] = await Promise.allSettled([graphApi.stats()])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)

      let nodes: cytoscape.ElementDefinition[] = []
      let edges: cytoscape.ElementDefinition[] = []

      if (query && query.trim() && query !== '*') {
        // Search mode: fetch matching nodes + their neighbors
        const { data } = await graphApi.search(query)
        nodes = data.nodes.map(n => ({
          data: {
            id:         n.id,
            label:      n.properties?.text || n.label,
            type:       n.label,
            group:      'Entity',
            properties: n.properties,
          },
        }))
      } else {
        // Full visualization mode
        const res = await fetch('http://localhost:8002/api/graph/visualization?limit=150')
        const vizData = await res.json()
        nodes = (vizData.nodes ?? []).map((n: { id: string; label: string; type: string; group: string; properties: Record<string,string> }) => ({
          data: { id: n.id, label: n.label, type: n.type, group: n.group, properties: n.properties },
        }))
        edges = (vizData.edges ?? [])
          .filter((e: { source: string; target: string; label: string }) => e.source && e.target)
          .map((e: { source: string; target: string; label: string }, i: number) => ({
            data: { id: `e-${i}`, source: e.source, target: e.target, label: e.label },
          }))
      }

      initCy([...nodes, ...edges])
    } catch {
      setStats({ nodeCount: 0, edgeCount: 0, rdfTriples: 0, documentCount: 0 })
      initCy([])
    } finally {
      setLoading(false)
    }
  }, [initCy])

  useEffect(() => { loadGraph() }, [loadGraph])

  const handleExport = async (fmt: 'json' | 'csv') => {
    const res = await fetch(`http://localhost:8002/api/graph/export?fmt=${fmt}`)
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `graph_export.${fmt}`; a.click()
    URL.revokeObjectURL(url)
  }

  // Legend items (CIM types)
  const legendItems = [
    { type: 'SUBSTATION',   label: 'Substation'  },
    { type: 'BUSBAR',       label: 'Bus'          },
    { type: 'LINE_SEGMENT', label: 'Line'         },
    { type: 'TRANSFORMER',  label: 'Transformer'  },
    { type: 'GENERATOR',    label: 'Generator'    },
    { type: 'LOAD',         label: 'Load'         },
  ]

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Nodes"  value={stats ? fmtNum(stats.nodeCount)  : '…'} icon={<Network   size={17}/>} iconColor="#6366F1" />
        <StatCard label="Total Edges"  value={stats ? fmtNum(stats.edgeCount)  : '…'} icon={<GitBranch size={17}/>} iconColor="#10B981" />
        <StatCard label="RDF Triples"  value={stats ? fmtNum(stats.rdfTriples) : '…'} icon={<Database  size={17}/>} iconColor="#8B5CF6" />
        <StatCard label="Documents"    value={stats ? String(stats.documentCount) : '…'} icon={<Search size={17}/>} iconColor="#F59E0B" />
      </div>

      {/* Graph + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* Cytoscape canvas */}
        <Card title="Knowledge Graph Visualization" className="xl:col-span-3" action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cg-faint" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadGraph(searchQ)}
                placeholder="Search nodes…"
                className="pl-7 pr-3 py-1.5 bg-cg-bg border border-cg-border rounded-lg text-xs text-cg-txt
                  placeholder:text-cg-faint focus:outline-none focus:border-cg-primary transition-all w-32"
              />
            </div>
            <button onClick={() => loadGraph(searchQ || '*')} disabled={loading}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors" title="Refresh">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => cyInstance.current?.fit(undefined, 30)}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors" title="Fit to screen">
              <Maximize2 size={13} />
            </button>
            <button onClick={() => cyInstance.current?.zoom((cyInstance.current?.zoom() ?? 1) * 1.3)}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors" title="Zoom in">
              <ZoomIn size={13} />
            </button>
            <button onClick={() => cyInstance.current?.zoom((cyInstance.current?.zoom() ?? 1) / 1.3)}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors" title="Zoom out">
              <ZoomOut size={13} />
            </button>
            <button onClick={() => handleExport('json')}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors" title="Export JSON">
              <Download size={13} />
            </button>
          </div>
        }>
          <div className="p-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-3">
              {legendItems.map(({ type, label }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(type) }} />
                  <span className="text-xs text-cg-muted">{label}</span>
                </div>
              ))}
              {nodeCount > 0 && (
                <span className="ml-auto text-xs text-cg-faint">{nodeCount} nodes loaded</span>
              )}
            </div>

            {/* Cytoscape container */}
            <div className="bg-cg-bg rounded-xl border border-cg-border/50 relative overflow-hidden" style={{ height: 420 }}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-cg-bg/80 z-10 rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-cg-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-cg-faint">Loading graph…</p>
                  </div>
                </div>
              )}
              <div ref={cyRef} className="w-full h-full" />
              {!loading && nodeCount === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Network size={32} className="text-cg-faint" />
                  <p className="text-sm text-cg-muted">No nodes in graph</p>
                  <p className="text-xs text-cg-faint">Upload CIM files to populate the knowledge graph</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Node Inspector */}
        <Card title="Node Inspector" action={<Info size={13} className="text-cg-faint" />}>
          <div className="p-4 space-y-4">
            {selectedNode ? (
              <>
                <div className="flex items-center gap-2.5 p-3 bg-cg-bg rounded-xl border border-cg-border/50">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getColor(selectedNode.type) }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-cg-txt leading-tight truncate">{selectedNode.label}</p>
                    <p className="text-xs text-cg-faint">{selectedNode.type}</p>
                  </div>
                </div>

                {Object.keys(selectedNode.properties).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">Properties</p>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {Object.entries(selectedNode.properties)
                        .filter(([k]) => !['entity_id','doc_id'].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs bg-cg-bg rounded-lg px-2.5 py-1.5 border border-cg-border/50 gap-2">
                            <span className="text-cg-muted capitalize shrink-0">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-cg-txt font-medium truncate">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => loadGraph(selectedNode.label)}
                    className="flex-1 text-xs py-2 rounded-lg bg-cg-primary-s text-cg-primary border border-cg-primary/20 hover:bg-cg-primary hover:text-white transition-all"
                  >
                    Search similar
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-cg-faint text-center py-8">Click a node to inspect it</p>
            )}
          </div>
        </Card>
      </div>

      {/* Export + SPARQL row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Export */}
        <Card title="Export Graph">
          <div className="p-5 space-y-3">
            <p className="text-xs text-cg-muted">Download the knowledge graph in standard formats for use with other tools.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { fmt: 'json' as const, label: 'JSON', desc: 'Nodes + edges with all properties' },
                { fmt: 'csv' as const,  label: 'CSV',  desc: 'Tabular format for Excel/pandas' },
              ].map(({ fmt, label, desc }) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="flex items-center gap-3 px-4 py-3 bg-cg-bg border border-cg-border rounded-xl
                    hover:border-cg-primary/40 hover:bg-cg-primary-s transition-all text-left group"
                >
                  <Download size={16} className="text-cg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-cg-txt">{label}</p>
                    <p className="text-[10px] text-cg-faint">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* SPARQL Editor */}
        <Card title="Cypher Query Editor">
          <div className="p-4 space-y-3">
            <textarea
              value={sparql}
              onChange={e => setSparql(e.target.value)}
              rows={4}
              className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-3
                text-sm text-emerald-400 font-mono resize-none
                focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/15 transition-all"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-cg-faint">Queries run against Neo4j knowledge graph</p>
              <button
                onClick={() => setQueryResult('Cypher execution via UI coming soon — use Neo4j Browser at localhost:7474')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                  gradient-primary text-white shadow-cg hover:opacity-90 transition-all"
              >
                <Play size={13} /> Run Query
              </button>
            </div>
            {queryResult && (
              <div className="bg-cg-bg border border-cg-border rounded-xl p-3 text-xs font-mono text-cg-muted">
                {queryResult}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

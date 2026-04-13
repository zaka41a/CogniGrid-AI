import { useState, useEffect, useCallback } from 'react'
import { Play, Network, GitBranch, Database, Search, Info, RefreshCw } from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { graphApi } from '../lib/api'
import type { GraphNode, NodeType } from '../types'

const NODE_COLORS: Record<string, string> = {
  Asset:    '#6366F1',
  Sensor:   '#10B981',
  Alert:    '#EF4444',
  Location: '#8B5CF6',
  Person:   '#3B82F6',
  Company:  '#10B981',
  Concept:  '#0D9488',
  default:  '#94A3B8',
}

function getColor(type: string) {
  return NODE_COLORS[type] ?? NODE_COLORS.default
}

interface LayoutNode extends GraphNode {
  x: number
  y: number
}

/** Arrange nodes in a simple radial layout */
function radialLayout(nodes: GraphNode[], w = 820, h = 480): LayoutNode[] {
  if (nodes.length === 0) return []
  const cx = w / 2, cy = h / 2
  const r = Math.min(w, h) * 0.38
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    return {
      ...n,
      x: nodes.length === 1 ? cx : cx + r * Math.cos(angle),
      y: nodes.length === 1 ? cy : cy + r * Math.sin(angle),
    }
  })
}

interface Edge { source: string; target: string; label?: string }
interface NodeDetail {
  id: string; name: string; type: string
  properties: Record<string, string>
  connectedNodes: string[]
}

const MOCK_SPARQL = `SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
  FILTER(?subject = <urn:asset:EG-447>)
}
LIMIT 25`

export default function Graph() {
  const [stats, setStats]           = useState<{ nodeCount: number; edgeCount: number; rdfTriples: number; documentCount: number } | null>(null)
  const [nodes, setNodes]           = useState<LayoutNode[]>([])
  const [edges, setEdges]           = useState<Edge[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail]         = useState<NodeDetail | null>(null)
  const [searchQ, setSearchQ]       = useState('')
  const [searching, setSearching]   = useState(false)
  const [loading, setLoading]       = useState(true)
  const [sparql, setSparql]         = useState(MOCK_SPARQL)
  const [queryResult, setQueryResult] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    try {
      const { data } = await graphApi.stats()
      setStats(data)
    } catch { /* backend may not be running */ }
  }, [])

  const searchGraph = useCallback(async (q: string) => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const { data } = await graphApi.search(q.trim())
      // Convert search results to layout nodes
      const rawNodes: GraphNode[] = data.map(r => ({
        id:    r.id,
        label: r.label,
        type:  (r.type as NodeType) ?? 'Asset',
        x:     0, y: 0,
      }))
      setNodes(radialLayout(rawNodes))
      setEdges([])
      setSelectedId(rawNodes[0]?.id ?? null)
    } catch {
      setNodes([])
      setEdges([])
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }, [])

  const loadNeighbors = useCallback(async (id: string) => {
    try {
      const { data } = await graphApi.neighbors(id)
      const center = nodes.find(n => n.id === id)
      const newNodes: GraphNode[] = data.map(n => ({ id: n.id, label: n.label, type: (n.type as NodeType), x: 0, y: 0 }))
      const allNodes = [
        ...(center ? [center] : []),
        ...newNodes.filter(n => n.id !== id),
      ]
      const laid = radialLayout(allNodes)
      setNodes(laid)
      setEdges(newNodes.map(n => ({ source: id, target: n.id })))
      setDetail({
        id,
        name: center?.label ?? id,
        type: center?.type ?? 'Asset',
        properties: data[0]?.properties ?? {},
        connectedNodes: newNodes.map(n => n.label),
      })
    } catch { /* ignore */ }
  }, [nodes])

  // Initial load: fetch stats then do a broad search to populate graph
  useEffect(() => {
    setLoading(true)
    loadStats().then(() => {
      graphApi.search('*').catch(() => graphApi.search('a')).then(({ data }) => {
        const rawNodes: GraphNode[] = data.slice(0, 20).map(r => ({
          id: r.id, label: r.label, type: (r.type as NodeType) ?? 'Asset', x: 0, y: 0,
        }))
        setNodes(radialLayout(rawNodes))
        if (rawNodes.length > 0) setSelectedId(rawNodes[0].id)
      }).catch(() => {
        setNodes([])
      }).finally(() => setLoading(false))
    })
  }, [loadStats])

  // Load neighbors when selection changes
  useEffect(() => {
    if (selectedId) loadNeighbors(selectedId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const fmtNum = (n: number) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000 ? n.toLocaleString() : String(n)

  const selectedNode = nodes.find(n => n.id === selectedId)

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Nodes"          value={stats ? fmtNum(stats.nodeCount)  : '…'} icon={<Network   size={17}/>} iconColor="#6366F1" />
        <StatCard label="Total Edges"          value={stats ? fmtNum(stats.edgeCount)  : '…'} icon={<GitBranch size={17}/>} iconColor="#10B981" />
        <StatCard label="RDF Triples"          value={stats ? fmtNum(stats.rdfTriples) : '…'} icon={<Database  size={17}/>} iconColor="#8B5CF6" />
        <StatCard label="Documents"            value={stats ? String(stats.documentCount) : '…'} icon={<Search size={17}/>} iconColor="#F59E0B" />
      </div>

      {/* Graph + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* SVG Graph canvas */}
        <Card title="Knowledge Graph Visualization" className="xl:col-span-3" action={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cg-faint" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchGraph(searchQ)}
                placeholder="Search nodes…"
                className="pl-7 pr-3 py-1.5 bg-cg-bg border border-cg-border rounded-lg text-xs text-cg-txt
                  placeholder:text-cg-faint focus:outline-none focus:border-cg-primary transition-all w-36"
              />
            </div>
            <button
              onClick={() => searchGraph(searchQ || '*')}
              disabled={searching}
              className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
            >
              <RefreshCw size={13} className={searching ? 'animate-spin' : ''} />
            </button>
            {/* Legend */}
            {['Asset','Sensor','Alert','Location'].map(type => (
              <div key={type} className="hidden lg:flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(type) }} />
                <span className="text-xs text-cg-muted">{type}</span>
              </div>
            ))}
          </div>
        }>
          <div className="p-4">
            <div className="bg-cg-bg rounded-xl overflow-hidden border border-cg-border/50">
              {loading ? (
                <div className="flex items-center justify-center" style={{ height: 380 }}>
                  <p className="text-cg-faint text-sm">Loading graph…</p>
                </div>
              ) : nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3" style={{ height: 380 }}>
                  <p className="text-cg-faint text-sm">No nodes found.</p>
                  <p className="text-cg-faint text-xs">Upload and process a document first.</p>
                </div>
              ) : (
                <svg viewBox="0 0 820 480" className="w-full" style={{ height: 380 }}>
                  <defs>
                    <marker id="arr" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill="#CBD5E1" />
                    </marker>
                  </defs>

                  {/* Edges */}
                  {edges.map((edge, i) => {
                    const src = nodes.find(n => n.id === edge.source)
                    const tgt = nodes.find(n => n.id === edge.target)
                    if (!src || !tgt) return null
                    return (
                      <line
                        key={i}
                        x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                        stroke="#CBD5E1" strokeWidth={1.2} opacity={0.5}
                        markerEnd="url(#arr)"
                      />
                    )
                  })}

                  {/* Nodes */}
                  {nodes.map(node => {
                    const isSelected = node.id === selectedId
                    const color = getColor(node.type)
                    const shortLabel = node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label
                    return (
                      <g key={node.id} onClick={() => setSelectedId(node.id)} className="cursor-pointer">
                        {isSelected && (
                          <circle cx={node.x} cy={node.y} r={22} fill={color} opacity={0.15} />
                        )}
                        <circle
                          cx={node.x} cy={node.y} r={12}
                          fill={color}
                          stroke={isSelected ? '#fff' : 'transparent'}
                          strokeWidth={2.5}
                          opacity={isSelected ? 1 : 0.8}
                        />
                        <text x={node.x} y={node.y + 26} textAnchor="middle" fontSize={9} fill="#94A3B8">
                          {shortLabel}
                        </text>
                      </g>
                    )
                  })}
                </svg>
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
                  <div>
                    <p className="text-sm font-semibold text-cg-txt leading-tight">{selectedNode.label}</p>
                    <p className="text-xs text-cg-faint">{selectedNode.type}</p>
                  </div>
                </div>

                {detail && Object.keys(detail.properties).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">Properties</p>
                    <div className="space-y-1.5">
                      {Object.entries(detail.properties).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs bg-cg-bg rounded-lg px-2.5 py-1.5 border border-cg-border/50">
                          <span className="text-cg-muted capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-cg-txt font-medium truncate max-w-[120px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail && detail.connectedNodes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">
                      Connected ({detail.connectedNodes.length})
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {detail.connectedNodes.map(name => (
                        <div key={name} className="flex items-center gap-2 text-xs text-cg-muted bg-cg-bg px-2.5 py-1.5 rounded-lg border border-cg-border/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-cg-primary shrink-0" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-cg-faint text-center py-8">Click a node to inspect it</p>
            )}
          </div>
        </Card>
      </div>

      {/* SPARQL Editor */}
      <Card title="SPARQL Query Editor">
        <div className="p-4 space-y-3">
          <textarea
            value={sparql}
            onChange={e => setSparql(e.target.value)}
            rows={5}
            className="w-full bg-cg-bg border border-cg-border rounded-xl px-4 py-3
              text-sm text-emerald-400 font-mono
              focus:outline-none focus:border-cg-primary focus:ring-2 focus:ring-cg-primary/15
              resize-none transition-all"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-cg-faint">Queries run against the knowledge graph</p>
            <button
              onClick={() => setQueryResult('SPARQL endpoint not yet connected — coming soon.')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                gradient-primary text-white shadow-cg hover:opacity-90 transition-all"
            >
              <Play size={13} /> Run Query
            </button>
          </div>
          {queryResult && (
            <div className="bg-cg-bg border border-cg-border rounded-xl p-4 text-xs font-mono text-cg-muted">
              {queryResult}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

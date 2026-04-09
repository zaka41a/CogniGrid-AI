import { useState } from 'react'
import { Play, Network, GitBranch, Database, Search, Info } from 'lucide-react'
import Card from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { mockGraphNodes, mockGraphEdges, mockSelectedNode } from '../mock'
import type { GraphNode, NodeType } from '../types'

const NODE_COLORS: Record<NodeType, string> = {
  Asset:    '#6366F1',
  Sensor:   '#10B981',
  Alert:    '#EF4444',
  Location: '#8B5CF6',
}

const LEGEND: { type: NodeType; color: string }[] = [
  { type: 'Asset',    color: NODE_COLORS.Asset    },
  { type: 'Sensor',   color: NODE_COLORS.Sensor   },
  { type: 'Alert',    color: NODE_COLORS.Alert     },
  { type: 'Location', color: NODE_COLORS.Location  },
]

const MOCK_SPARQL = `SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
  FILTER(?subject = <urn:asset:EG-447>)
}
LIMIT 25`

export default function Graph() {
  const [selectedId, setSelectedId] = useState<string>('n1')
  const [sparql, setSparql] = useState(MOCK_SPARQL)
  const [queryRan, setQueryRan] = useState(false)

  const selected = mockGraphNodes.find((n) => n.id === selectedId)
  const detail = selectedId === 'n1' ? mockSelectedNode : {
    id: selectedId,
    name: selected?.label ?? '',
    type: selected?.type ?? 'Asset',
    properties: { status: 'Operational', lastUpdated: '2026-04-02' },
    connectedNodes: mockGraphEdges
      .filter(e => e.source === selectedId || e.target === selectedId)
      .map(e => {
        const otherId = e.source === selectedId ? e.target : e.source
        return mockGraphNodes.find(n => n.id === otherId)?.label ?? otherId
      }),
  }

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Nodes"          value="24,812" icon={<Network  size={17}/>} iconColor="#6366F1" />
        <StatCard label="Total Edges"          value="68,440" icon={<GitBranch size={17}/>} iconColor="#10B981" />
        <StatCard label="RDF Triples"          value="1.2M"   icon={<Database  size={17}/>} iconColor="#8B5CF6" />
        <StatCard label="SPARQL Queries Today" value="134"    icon={<Search    size={17}/>} iconColor="#F59E0B" />
      </div>

      {/* Graph + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* SVG Graph canvas */}
        <Card title="Knowledge Graph Visualization" className="xl:col-span-3" action={
          <div className="flex items-center gap-3">
            {LEGEND.map(({ type, color }) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-cg-muted">{type}</span>
              </div>
            ))}
          </div>
        }>
          <div className="p-4">
            <div className="bg-cg-bg rounded-xl overflow-hidden border border-cg-border/50">
              <svg viewBox="0 0 820 480" className="w-full" style={{ height: 380 }}>
                {/* Edges */}
                {mockGraphEdges.map((edge, i) => {
                  const src = mockGraphNodes.find(n => n.id === edge.source)!
                  const tgt = mockGraphNodes.find(n => n.id === edge.target)!
                  return (
                    <line
                      key={i}
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke="currentColor" strokeWidth={1.2}
                      className="text-cg-border"
                      opacity={0.6}
                    />
                  )
                })}

                {/* Nodes */}
                {mockGraphNodes.map((node: GraphNode) => {
                  const isSelected = node.id === selectedId
                  const color = NODE_COLORS[node.type]
                  return (
                    <g key={node.id} onClick={() => setSelectedId(node.id)} className="cursor-pointer">
                      {isSelected && (
                        <circle cx={node.x} cy={node.y} r={20} fill={color} opacity={0.15} />
                      )}
                      <circle
                        cx={node.x} cy={node.y} r={11}
                        fill={color}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={2.5}
                        opacity={isSelected ? 1 : 0.8}
                        className="drop-shadow-sm"
                      />
                      <text
                        x={node.x} y={node.y + 25}
                        textAnchor="middle" fontSize={9} fill="#94A3B8"
                      >
                        {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </Card>

        {/* Node Inspector */}
        <Card title="Node Inspector" action={<Info size={13} className="text-cg-faint" />}>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2.5 p-3 bg-cg-bg rounded-xl border border-cg-border/50">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[detail.type] }} />
              <div>
                <p className="text-sm font-semibold text-cg-txt leading-tight">{detail.name}</p>
                <p className="text-xs text-cg-faint">{detail.type}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">Properties</p>
              <div className="space-y-1.5">
                {Object.entries(detail.properties).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs bg-cg-bg rounded-lg px-2.5 py-1.5 border border-cg-border/50">
                    <span className="text-cg-muted capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-cg-txt font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-cg-muted uppercase tracking-wide mb-2">
                Connected ({detail.connectedNodes.length})
              </p>
              <div className="space-y-1">
                {detail.connectedNodes.map(name => (
                  <div key={name} className="flex items-center gap-2 text-xs text-cg-muted bg-cg-bg px-2.5 py-1.5 rounded-lg border border-cg-border/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-cg-primary shrink-0" />
                    {name}
                  </div>
                ))}
              </div>
            </div>
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
            <p className="text-xs text-cg-faint">Queries run against the CIM ontology graph</p>
            <button
              onClick={() => setQueryRan(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                gradient-primary text-white shadow-cg hover:opacity-90 transition-all"
            >
              <Play size={13} /> Run Query
            </button>
          </div>
          {queryRan && (
            <div className="bg-cg-bg border border-cg-border rounded-xl p-4 text-xs font-mono space-y-1.5">
              <p className="text-cg-faint mb-2">// 3 triples returned</p>
              <p><span className="text-indigo-400">urn:asset:EG-447</span> <span className="text-amber-400">rdf:type</span> <span className="text-emerald-400">cim:Substation</span></p>
              <p><span className="text-indigo-400">urn:asset:EG-447</span> <span className="text-amber-400">cim:voltage</span> <span className="text-emerald-400">"110 kV"</span></p>
              <p><span className="text-indigo-400">urn:asset:EG-447</span> <span className="text-amber-400">cim:connectedTo</span> <span className="text-emerald-400">urn:sensor:EG-01</span></p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

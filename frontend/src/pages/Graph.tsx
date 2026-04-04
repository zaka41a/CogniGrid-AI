import { useState } from 'react'
import { Play, Network, GitBranch, Database, Search } from 'lucide-react'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import { mockGraphNodes, mockGraphEdges, mockSelectedNode } from '../mock'
import type { GraphNode, NodeType } from '../types'

const NODE_COLORS: Record<NodeType, string> = {
  Asset:    '#3B82F6',
  Sensor:   '#22C55E',
  Alert:    '#EF4444',
  Location: '#6B7280',
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
      .filter((e) => e.source === selectedId || e.target === selectedId)
      .map((e) => {
        const otherId = e.source === selectedId ? e.target : e.source
        return mockGraphNodes.find((n) => n.id === otherId)?.label ?? otherId
      }),
  }

  const viewW = 820
  const viewH = 480

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Nodes"        value="24,812" icon={<Network size={16} className="text-blue-400" />}    iconBg="bg-blue-500/15" />
        <StatCard label="Total Edges"        value="68,440" icon={<GitBranch size={16} className="text-green-400" />} iconBg="bg-green-500/15" />
        <StatCard label="RDF Triples"        value="1.2M"   icon={<Database size={16} className="text-purple-400" />} iconBg="bg-purple-500/15" />
        <StatCard label="SPARQL Queries Today" value="134"  icon={<Search size={16} className="text-yellow-400" />}   iconBg="bg-yellow-500/15" />
      </div>

      {/* Graph + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* SVG Graph */}
        <Card title="Knowledge Graph Visualization" className="xl:col-span-3">
          <div className="p-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-3">
              {LEGEND.map(({ type, color }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-cg-muted">{type}</span>
                </div>
              ))}
            </div>

            <div className="bg-cg-bg rounded-lg overflow-hidden">
              <svg
                viewBox={`0 0 ${viewW} ${viewH}`}
                className="w-full"
                style={{ height: 400 }}
              >
                {/* Edges */}
                {mockGraphEdges.map((edge, i) => {
                  const src = mockGraphNodes.find((n) => n.id === edge.source)!
                  const tgt = mockGraphNodes.find((n) => n.id === edge.target)!
                  return (
                    <line
                      key={i}
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke="#2A2D3E" strokeWidth={1.5}
                    />
                  )
                })}

                {/* Nodes */}
                {mockGraphNodes.map((node: GraphNode) => {
                  const isSelected = node.id === selectedId
                  const color = NODE_COLORS[node.type]
                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedId(node.id)}
                      className="cursor-pointer"
                    >
                      {isSelected && (
                        <circle cx={node.x} cy={node.y} r={18} fill={color} opacity={0.2} />
                      )}
                      <circle
                        cx={node.x} cy={node.y} r={12}
                        fill={color}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={2}
                        opacity={isSelected ? 1 : 0.85}
                      />
                      <text
                        x={node.x} y={node.y + 26}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#9CA3AF"
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
        <Card title="Node Inspector">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs text-cg-muted mb-1">Name</p>
              <p className="text-sm font-semibold text-cg-txt">{detail.name}</p>
            </div>
            <div>
              <p className="text-xs text-cg-muted mb-1">Type</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[detail.type] }} />
                <p className="text-sm text-cg-txt">{detail.type}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-cg-muted mb-2">Properties</p>
              <div className="space-y-1.5">
                {Object.entries(detail.properties).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs bg-cg-bg rounded px-2.5 py-1.5">
                    <span className="text-cg-muted capitalize">{k}</span>
                    <span className="text-cg-txt font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-cg-muted mb-2">Connected Nodes ({detail.connectedNodes.length})</p>
              <div className="space-y-1">
                {detail.connectedNodes.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-xs text-cg-muted bg-cg-bg px-2.5 py-1.5 rounded">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
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
            onChange={(e) => setSparql(e.target.value)}
            rows={5}
            className="w-full bg-cg-bg border border-cg-border rounded-lg px-4 py-3 text-sm text-green-400 font-mono focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-cg-faint">Query will run against the CIM ontology graph</p>
            <button
              onClick={() => setQueryRan(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Play size={14} /> Run Query
            </button>
          </div>
          {queryRan && (
            <div className="bg-cg-bg border border-cg-border rounded-lg p-4 text-xs font-mono text-cg-muted space-y-1">
              <p className="text-cg-faint mb-2">// Mock result — 3 triples returned</p>
              <p><span className="text-blue-400">urn:asset:EG-447</span> <span className="text-yellow-400">rdf:type</span> <span className="text-green-400">cim:Substation</span></p>
              <p><span className="text-blue-400">urn:asset:EG-447</span> <span className="text-yellow-400">cim:voltage</span> <span className="text-green-400">"110 kV"</span></p>
              <p><span className="text-blue-400">urn:asset:EG-447</span> <span className="text-yellow-400">cim:connectedTo</span> <span className="text-green-400">urn:sensor:EG-01</span></p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

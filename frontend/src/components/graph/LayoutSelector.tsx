import type cytoscape from 'cytoscape'
import { LayoutGrid } from 'lucide-react'

export type LayoutName = 'cose' | 'cose-bilkent' | 'dagre' | 'concentric' | 'breadthfirst' | 'grid' | 'circle'

const LABELS: Record<LayoutName, string> = {
  'cose':         'Force (cose)',
  'cose-bilkent': 'Force (bilkent)',
  'dagre':        'Hierarchical',
  'concentric':   'Concentric',
  'breadthfirst': 'Tree',
  'grid':         'Grid',
  'circle':       'Circle',
}

const ALL: LayoutName[] = ['cose', 'cose-bilkent', 'dagre', 'concentric', 'breadthfirst', 'grid', 'circle']

/** Cytoscape layout options for each named layout. */
export function layoutOptions(name: LayoutName): cytoscape.LayoutOptions {
  switch (name) {
    case 'cose':
      return {
        name: 'cose',
        animate: true,
        animationDuration: 600,
        nodeRepulsion: () => 6000,
        idealEdgeLength: () => 80,
        edgeElasticity: () => 100,
        gravity: 0.25,
        numIter: 500,
        fit: true,
        padding: 30,
      } as unknown as cytoscape.LayoutOptions
    case 'cose-bilkent':
      return {
        name: 'cose-bilkent',
        animate: 'end',
        animationDuration: 600,
        nodeRepulsion: 8000,
        idealEdgeLength: 80,
        gravity: 0.25,
        numIter: 1500,
        fit: true,
        padding: 30,
      } as unknown as cytoscape.LayoutOptions
    case 'dagre':
      return {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 50,
        rankSep: 80,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 30,
      } as unknown as cytoscape.LayoutOptions
    case 'concentric':
      return {
        name: 'concentric',
        animate: true,
        animationDuration: 500,
        concentric: (n: cytoscape.NodeSingular) => n.degree(false),
        levelWidth: () => 1,
        minNodeSpacing: 30,
        fit: true,
        padding: 30,
      } as unknown as cytoscape.LayoutOptions
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        animate: true,
        animationDuration: 500,
        spacingFactor: 1.4,
        directed: true,
        fit: true,
        padding: 30,
      } as cytoscape.BreadthFirstLayoutOptions
    case 'grid':
      return { name: 'grid', animate: true, animationDuration: 400, fit: true, padding: 30 } as cytoscape.GridLayoutOptions
    case 'circle':
      return { name: 'circle', animate: true, animationDuration: 400, fit: true, padding: 30 } as cytoscape.CircleLayoutOptions
  }
}

interface Props {
  value: LayoutName
  onChange: (next: LayoutName) => void
  className?: string
}

export function LayoutSelector({ value, onChange, className = '' }: Props) {
  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`} title="Graph layout">
      <LayoutGrid size={12} className="text-cg-faint" />
      <select
        value={value}
        onChange={e => onChange(e.target.value as LayoutName)}
        className="bg-cg-bg border border-cg-border rounded-lg text-xs text-cg-txt px-2 py-1
          focus:outline-none focus:border-cg-primary transition-all"
      >
        {ALL.map(l => (
          <option key={l} value={l}>{LABELS[l]}</option>
        ))}
      </select>
    </div>
  )
}

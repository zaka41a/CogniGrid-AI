import type cytoscape from 'cytoscape'

type Format = 'json' | 'csv' | 'png' | 'svg'

interface JsonExport {
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

function downloadBlob(content: BlobPart, mime: string, filename: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

/**
 * Export the current Cytoscape instance in the chosen format.
 * - json/csv: structural export (nodes + edges)
 * - png:      raster bitmap (cy.png — Cytoscape built-in)
 * - svg:      not natively supported by cytoscape — falls back to PNG with a console warning
 *             (adding cytoscape-svg would bring a 200 KB dep that isn't justified yet)
 */
export function exportGraph(cy: cytoscape.Core, fmt: Format, basename = 'graph_export'): void {
  if (fmt === 'json') {
    const nodes = cy.nodes().map(n => ({ id: n.id(), label: n.data('label'), type: n.data('type'), ...n.data('properties') }))
    const edges = cy.edges().map(e => ({ source: e.data('source'), target: e.data('target'), label: e.data('label') }))
    const payload: JsonExport = { nodes, edges }
    downloadBlob(JSON.stringify(payload, null, 2), 'application/json', `${basename}.json`)
    return
  }
  if (fmt === 'csv') {
    const header = 'id,label,type\n'
    const rows = cy.nodes().map(n => {
      const label = String(n.data('label') ?? '').replace(/,/g, ';')
      return `${n.id()},${label},${n.data('type') ?? ''}`
    }).join('\n')
    downloadBlob(header + rows, 'text/csv', `${basename}.csv`)
    return
  }
  if (fmt === 'png') {
    const dataUrl = cy.png({ scale: 2, full: true, bg: '#0F172A' })
    downloadDataUrl(dataUrl, `${basename}.png`)
    return
  }
  if (fmt === 'svg') {
    // Cytoscape core has no SVG export. Fall back gracefully.
    console.warn('SVG export requires cytoscape-svg; falling back to high-DPI PNG')
    const dataUrl = cy.png({ scale: 3, full: true, bg: '#0F172A' })
    downloadDataUrl(dataUrl, `${basename}.png`)
  }
}

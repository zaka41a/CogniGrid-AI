import type cytoscape from 'cytoscape'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import 'tippy.js/dist/tippy.css'

interface NodeTooltipData {
  label?: string
  type?: string
  properties?: Record<string, unknown>
}

const SKIP_KEYS = new Set(['entity_id', 'doc_id', 'embedding'])

function buildTooltipHtml(data: NodeTooltipData): string {
  const label = data.label ?? '(unnamed)'
  const type  = data.type  ?? 'unknown'
  const props = data.properties ?? {}

  const propsLines = Object.entries(props)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '' && !SKIP_KEYS.has(k))
    .slice(0, 4)
    .map(([k, v]) => {
      const value = String(v)
      const trimmed = value.length > 60 ? value.slice(0, 58) + '…' : value
      return `<div style="display:flex;gap:8px;font-size:11px;margin-top:2px"><span style="color:#94a3b8">${k}</span><span style="color:#e2e8f0">${trimmed}</span></div>`
    })
    .join('')

  return `
    <div style="font-family:system-ui,sans-serif;min-width:180px">
      <div style="font-size:12px;font-weight:600;color:#fff;line-height:1.2">${label}</div>
      <div style="font-size:10px;color:#a78bfa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">${type}</div>
      ${propsLines ? `<div style="border-top:1px solid #334155;margin-top:6px;padding-top:6px">${propsLines}</div>` : ''}
    </div>
  `
}

/**
 * Attach tippy.js tooltips to every node of a Cytoscape instance.
 * Call once after each cy.elements() refresh; returns a disposer.
 */
export function attachGraphTooltips(cy: cytoscape.Core): () => void {
  const tippies: TippyInstance[] = []

  cy.nodes().forEach(node => {
    const data = node.data() as NodeTooltipData
    const ref = (node as unknown as { popperRef?: () => HTMLElement }).popperRef?.()
      ?? (() => {
        const bb = node.renderedBoundingBox()
        const div = document.createElement('div')
        div.style.position = 'absolute'
        div.style.left = `${bb.x1 + bb.w / 2}px`
        div.style.top = `${bb.y1 + bb.h / 2}px`
        div.style.width = '1px'
        div.style.height = '1px'
        return div
      })()

    const html = buildTooltipHtml(data)
    const t = tippy(document.createElement('div'), {
      content: html,
      allowHTML: true,
      trigger: 'manual',
      placement: 'top',
      arrow: true,
      theme: 'dark',
      appendTo: () => document.body,
      offset: [0, 8],
      delay: [120, 0],
      getReferenceClientRect: () => {
        const bb = node.renderedBoundingBox()
        const cont = cy.container()
        const rect = cont?.getBoundingClientRect()
        if (!rect) return new DOMRect(0, 0, 0, 0)
        return new DOMRect(rect.left + bb.x1, rect.top + bb.y1, bb.w, bb.h)
      },
    })
    tippies.push(t)
    ;(node as unknown as { _tippy?: TippyInstance })._tippy = t
    void ref // suppress unused
  })

  const onMouseOver = (e: cytoscape.EventObject) => {
    const t = (e.target as unknown as { _tippy?: TippyInstance })._tippy
    t?.show()
  }
  const onMouseOut = (e: cytoscape.EventObject) => {
    const t = (e.target as unknown as { _tippy?: TippyInstance })._tippy
    t?.hide()
  }
  const onPan = () => tippies.forEach(t => t.popperInstance?.update?.())

  cy.on('mouseover', 'node', onMouseOver)
  cy.on('mouseout', 'node', onMouseOut)
  cy.on('pan zoom', onPan)

  return () => {
    cy.off('mouseover', 'node', onMouseOver)
    cy.off('mouseout', 'node', onMouseOut)
    cy.off('pan zoom', onPan)
    tippies.forEach(t => { try { t.destroy() } catch { /* ignore */ } })
  }
}

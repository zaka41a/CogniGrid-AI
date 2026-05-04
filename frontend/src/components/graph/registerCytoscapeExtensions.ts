import cytoscape from 'cytoscape'
// @ts-expect-error - cytoscape-dagre has no types bundled
import dagre from 'cytoscape-dagre'
// @ts-expect-error - cose-bilkent has no types bundled
import coseBilkent from 'cytoscape-cose-bilkent'
// @ts-expect-error - navigator has no types bundled
import navigator from 'cytoscape-navigator'

let registered = false

/**
 * Register Cytoscape layout + UI extensions exactly once.
 * Safe to call from multiple components (idempotent).
 */
export function registerCytoscapeExtensions(): void {
  if (registered) return
  registered = true
  try {
    cytoscape.use(dagre)
    cytoscape.use(coseBilkent)
    cytoscape.use(navigator)
  } catch {
    // Already registered (HMR re-import) — safe to ignore
  }
}

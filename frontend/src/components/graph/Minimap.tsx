import { useEffect, useRef } from 'react'
import type cytoscape from 'cytoscape'

/**
 * Wraps cytoscape-navigator into a React component.
 * Mounts a small overview canvas linked to the parent Cytoscape instance.
 *
 * The host page must call registerCytoscapeExtensions() before instantiating
 * its main Cytoscape, otherwise `cy.navigator` is undefined.
 */
interface Props {
  cy: cytoscape.Core | null
  visible?: boolean
}

interface NavigatorInstance { destroy: () => void }

interface CyWithNavigator extends cytoscape.Core {
  navigator?: (opts: Record<string, unknown>) => NavigatorInstance
}

export function Minimap({ cy, visible = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<NavigatorInstance | null>(null)

  useEffect(() => {
    if (!cy || !containerRef.current || !visible) return
    const cyN = cy as CyWithNavigator
    if (typeof cyN.navigator !== 'function') return

    const nav = cyN.navigator({
      container: containerRef.current,
      viewLiveFramerate: 0,
      thumbnailEventFramerate: 30,
      thumbnailLiveFramerate: false,
      dblClickDelay: 200,
      removeCustomContainer: false,
      rerenderDelay: 100,
    })
    navRef.current = nav

    return () => {
      try { nav.destroy() } catch { /* ignore */ }
      navRef.current = null
    }
  }, [cy, visible])

  if (!visible) return null
  return (
    <div
      ref={containerRef}
      className="absolute bottom-3 right-3 w-40 h-28 bg-cg-bg/90 backdrop-blur border border-cg-border rounded-lg overflow-hidden shadow-lg"
      style={{ zIndex: 5 }}
    />
  )
}

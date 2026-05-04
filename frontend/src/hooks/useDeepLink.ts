import { useNavigate, useLocation } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

/**
 * Cross-page navigation helper that carries typed state.
 * Example:
 *   const link = useDeepLink<{ focusNodeId: string }>()
 *   link.go('/app/graph', { focusNodeId: 'sub-12' })
 *
 *   // On the target page:
 *   const { state } = useDeepLink<{ focusNodeId: string }>().consume()
 */
export function useDeepLink<T = Record<string, unknown>>() {
  const navigate = useNavigate()
  const location = useLocation()

  const go = useCallback((path: string, state?: T) => {
    navigate(path, { state })
  }, [navigate])

  const consume = useCallback((): { state: T | null } => {
    const s = (location.state as T) ?? null
    // Clear so a refresh doesn't re-trigger the deep-link action
    if (s) window.history.replaceState({}, '')
    return { state: s }
  }, [location.state])

  return useMemo(() => ({ go, consume, current: location.state as T | null }), [go, consume, location.state])
}

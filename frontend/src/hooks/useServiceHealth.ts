import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'

export type ServiceStatus = 'online' | 'degraded' | 'offline' | 'unknown'

export interface ServiceHealthEntry {
  name: string
  status: ServiceStatus
  latency_ms: number | null
  error?: string | null
}

export interface SystemHealth {
  overall: 'healthy' | 'partial' | 'down'
  services: ServiceHealthEntry[]
  checked_at: string
}

const POLL_MS = 30_000
const GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'http://localhost:8080'

/**
 * Polls the Gateway aggregated /api/system/health endpoint every 30s.
 * Returns null until the first response lands.
 */
export function useServiceHealth(intervalMs = POLL_MS) {
  const [data, setData] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOnce = useCallback(async () => {
    try {
      const token = localStorage.getItem('cg_token') ?? ''
      const { data } = await axios.get<SystemHealth>(`${GATEWAY}/api/system/health`, {
        timeout: 8_000,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      setData(data)
      setError(null)
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? 'Health endpoint unreachable'
      setError(msg)
      // If the Gateway itself is down, expose a synthetic "down" state
      setData({
        overall: 'down',
        services: [{ name: 'gateway', status: 'offline', latency_ms: null, error: msg }],
        checked_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOnce()
    timerRef.current = setInterval(fetchOnce, intervalMs)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchOnce, intervalMs])

  return { data, loading, error, refresh: fetchOnce }
}

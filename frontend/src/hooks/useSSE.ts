import { useEffect, useRef, useState, useCallback } from 'react'

export interface SSEOptions {
  url: string
  body?: unknown
  headers?: Record<string, string>
  onEvent?: (event: { type: string; data: string }) => void
  onError?: (err: unknown) => void
  onDone?: () => void
  enabled?: boolean
}

interface SSEState {
  streaming: boolean
  error: string | null
  start: (opts?: Partial<SSEOptions>) => void
  stop: () => void
}

/**
 * Server-Sent Events client for POST endpoints (FastAPI sse-starlette).
 * Uses fetch + ReadableStream because the native EventSource only supports GET.
 */
export function useSSE(defaults: Partial<SSEOptions> = {}): SSEState {
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }, [])

  const start = useCallback(async (overrides?: Partial<SSEOptions>) => {
    const opts: SSEOptions = { url: '', ...defaults, ...overrides }
    if (!opts.url) {
      setError('SSE: url is required')
      return
    }
    stop()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStreaming(true)
    setError(null)

    try {
      const resp = await fetch(opts.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...opts.headers },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
      })
      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`)
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE events are separated by \n\n
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const raw of parts) {
          const eventType = raw.match(/^event:\s*(.+)$/m)?.[1] ?? 'message'
          const data = raw.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n')
          if (data) opts.onEvent?.({ type: eventType, data })
        }
      }
      opts.onDone?.()
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== 'AbortError') {
        const msg = (e as Error).message ?? 'SSE error'
        setError(msg)
        opts.onError?.(e)
      }
    } finally {
      setStreaming(false)
    }
  }, [defaults, stop])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { streaming, error, start, stop }
}

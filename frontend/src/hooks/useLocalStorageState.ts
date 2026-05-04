import { useState, useEffect, useCallback } from 'react'

/**
 * Typed wrapper around localStorage with React state semantics.
 * - Reads once on mount
 * - Writes synchronously on each setState
 * - Falls back gracefully if localStorage throws (private browsing, quota)
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Quota exceeded or private mode — ignore silently
    }
  }, [key, value])

  const update = useCallback((v: T | ((p: T) => T)) => {
    setValue(prev => typeof v === 'function' ? (v as (p: T) => T)(prev) : v)
  }, [])

  return [value, update]
}

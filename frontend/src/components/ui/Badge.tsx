import type { ReactNode } from 'react'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'critical'

const STYLES: Record<Variant, string> = {
  success:  'bg-green-500/15 text-green-400 border border-green-500/30',
  warning:  'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  error:    'bg-red-500/15 text-red-400 border border-red-500/30',
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  info:     'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  neutral:  'bg-gray-500/15 text-cg-muted border border-gray-500/30',
}

interface Props {
  variant?: Variant
  children: ReactNode
  className?: string
}

export function severityVariant(s: string): Variant {
  if (s === 'Critical') return 'critical'
  if (s === 'Medium')   return 'warning'
  if (s === 'Low')      return 'success'
  return 'neutral'
}

export function statusVariant(s: string): Variant {
  if (s === 'Success')      return 'success'
  if (s === 'Processing')   return 'warning'
  if (s === 'Error')        return 'error'
  if (s === 'Open')         return 'error'
  if (s === 'Acknowledged') return 'warning'
  if (s === 'Resolved')     return 'success'
  return 'neutral'
}

export default function Badge({ variant = 'neutral', children, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STYLES[variant]} ${className}`}>
      {children}
    </span>
  )
}

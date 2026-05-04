export type DateRange = '24h' | '7d' | '14d' | '30d' | '90d'

const ALL: DateRange[] = ['24h', '7d', '14d', '30d', '90d']
const LABELS: Record<DateRange, string> = {
  '24h': '24h',
  '7d':  '7d',
  '14d': '14d',
  '30d': '30d',
  '90d': '90d',
}

export function rangeToDays(r: DateRange): number {
  switch (r) {
    case '24h': return 1
    case '7d':  return 7
    case '14d': return 14
    case '30d': return 30
    case '90d': return 90
  }
}

interface Props {
  value: DateRange
  onChange: (next: DateRange) => void
  options?: DateRange[]
  className?: string
}

export function DateRangeSelector({ value, onChange, options = ALL, className = '' }: Props) {
  return (
    <div className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-cg-bg border border-cg-border ${className}`}>
      {options.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
            value === r
              ? 'bg-cg-primary text-white'
              : 'text-cg-muted hover:text-cg-txt'
          }`}
        >
          {LABELS[r]}
        </button>
      ))}
    </div>
  )
}

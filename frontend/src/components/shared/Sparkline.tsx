/**
 * Tiny inline trendline for KPI cards. Lightweight pure SVG — no recharts overhead.
 * Pass an array of numbers; the component normalises to fit width × height.
 */
interface Props {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  className?: string
}

export function Sparkline({ values, width = 64, height = 20, stroke = '#6366F1', fill = 'rgba(99,102,241,0.15)', className = '' }: Props) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#64748B" strokeOpacity={0.3} strokeWidth={1} />
      </svg>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Closed area for the fill (down to baseline)
  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <polygon points={areaPoints} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

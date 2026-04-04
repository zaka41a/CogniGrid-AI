import { useAppStore } from '../store'

export function useChartColors() {
  const theme = useAppStore((s) => s.theme)
  const dark = theme === 'dark'
  return {
    grid:  dark ? '#2A2D3E' : '#E2E8F0',
    tick:  dark ? '#6B7280' : '#94A3B8',
    tooltip: {
      contentStyle: {
        background:   dark ? '#1A1D27' : '#FFFFFF',
        border:       `1px solid ${dark ? '#2A2D3E' : '#E2E8F0'}`,
        borderRadius: 8,
        fontSize:     12,
        color:        dark ? '#F9FAFB' : '#0F172A',
      },
      labelStyle: { color: dark ? '#F9FAFB' : '#0F172A' },
    },
  }
}

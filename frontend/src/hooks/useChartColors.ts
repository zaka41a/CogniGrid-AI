export function useChartColors() {
  return {
    grid: '#E2E8F0',
    tick: '#94A3B8',
    tooltip: {
      contentStyle: {
        background:   '#FFFFFF',
        border:       '1px solid #E2E8F0',
        borderRadius: 8,
        fontSize:     12,
        color:        '#0F172A',
      },
      labelStyle: { color: '#0F172A' },
    },
  }
}

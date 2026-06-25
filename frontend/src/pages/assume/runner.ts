import { runnerHttp } from '../../lib/api'

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface RunInfo {
  run_id: string
  status: RunStatus
  scenario_name: string
  description: string
  started_at?: string
  finished_at?: string
  duration_s?: number
  log_lines: string[]
  error?: string
  results_summary?: {
    clearing_price?: { mean: number; min: number; max: number; count: number }
    supply_volume_mw?: { mean: number; max: number }
    dispatch_mwh?: Record<string, number>
    dispatch?: Record<string, number>
    files_generated?: number
  }
  output_files: string[]
}

export interface StartRunBody {
  yaml_config: string
  scenario_name: string
  description?: string
  push_to_graph?: boolean
  // Optional uploaded timeseries (raw CSV text). Keys: demand, availability, fuel_prices.
  timeseries?: Record<string, string>
}

export const runnerApi = {
  list:   () => runnerHttp.get<RunInfo[]>('/api/runner/runs', { timeout: 8_000 }),
  start:  (body: StartRunBody) => runnerHttp.post<RunInfo>('/api/runner/runs', body),
  remove: (id: string) => runnerHttp.delete(`/api/runner/runs/${id}`),
  health: () => runnerHttp.get('/health', { timeout: 5_000 }),
}

export const STATUS_STYLE: Record<RunStatus, string> = {
  pending:   'text-amber-400 bg-amber-500/10 border-amber-500/40',
  running:   'text-blue-400 bg-blue-500/10 border-blue-500/40',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
  failed:    'text-red-400 bg-red-500/10 border-red-500/40',
  cancelled: 'text-cg-faint bg-cg-s2 border-cg-border',
}

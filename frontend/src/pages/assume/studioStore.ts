import { create } from 'zustand'

export type StudioStep = 'advisor' | 'design' | 'timeseries' | 'run' | 'results' | 'compare'

export interface TimeseriesEntry {
  fileName: string
  csv: string
  columns: string[]
  rowCount: number
}

export type TimeseriesKey = 'demand' | 'availability' | 'fuelPrices'

interface StudioState {
  step: StudioStep
  scenarioName: string
  yaml: string
  pushGraph: boolean
  selectedRunId: string | null
  timeseries: Record<TimeseriesKey, TimeseriesEntry | null>
  setStep: (s: StudioStep) => void
  setScenarioName: (n: string) => void
  setYaml: (y: string) => void
  setPushGraph: (b: boolean) => void
  setSelectedRunId: (id: string | null) => void
  setTimeseries: (k: TimeseriesKey, e: TimeseriesEntry | null) => void
}

export const DEFAULT_ASSUME_YAML = `general:
  scenario_name: "day_ahead_example"
  start_date: "2019-01-01"
  end_date: "2019-01-02"
  time_step: "1h"

markets:
  EOM:
    operator: EOM
    product: "simple_dayahead_auction"
    opening_time: "0h"
    closing_time: "-1h"
    products:
      - duration: "1h"
        count: 24
        first_delivery: "0h"

units:
  coal_1:
    technology: power_plant
    unit_operator: operator_1
    fuel_type: coal
    emission_factor: 0.82
    max_power: 400
    min_power: 100
    efficiency: 0.40
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

  wind_1:
    technology: power_plant
    unit_operator: operator_2
    fuel_type: wind
    emission_factor: 0.0
    max_power: 200
    min_power: 0
    efficiency: 1.0
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

  gas_peaker:
    technology: power_plant
    unit_operator: operator_3
    fuel_type: natural_gas
    emission_factor: 0.45
    max_power: 100
    min_power: 20
    efficiency: 0.52
    bidding_strategies:
      EOM: NaiveSingleBidStrategy

demand:
  demand_1:
    technology: demand
    unit_operator: demand
    max_power: 600
    min_power: 300

fuel_prices:
  coal: 25.0
  natural_gas: 35.0
  co2: 25.0
`

export const ASSUME_SYSTEM =
  'You are an ASSUME Expert AI, specialised in the ASSUME (Agent-based Simulation ' +
  'of Electricity Markets) Python framework. Help the user design scenarios, ' +
  'configure markets and units, choose bidding strategies, and interpret results. ' +
  'Reference real ASSUME classes (NaiveSingleBidStrategy, flexable strategies, ' +
  'clearing algorithms) and give concrete YAML when asked.'

export const useStudio = create<StudioState>((set) => ({
  step: 'design',
  scenarioName: 'day_ahead_example',
  yaml: DEFAULT_ASSUME_YAML,
  pushGraph: true,
  selectedRunId: null,
  timeseries: { demand: null, availability: null, fuelPrices: null },
  setStep: (step) => set({ step }),
  setScenarioName: (scenarioName) => set({ scenarioName }),
  setYaml: (yaml) => set({ yaml }),
  setPushGraph: (pushGraph) => set({ pushGraph }),
  setSelectedRunId: (selectedRunId) => set({ selectedRunId }),
  setTimeseries: (k, e) => set((s) => ({ timeseries: { ...s.timeseries, [k]: e } })),
}))

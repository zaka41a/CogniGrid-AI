import { useRef } from 'react'
import { Upload, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useStudio, type TimeseriesKey, type TimeseriesEntry } from '../studioStore'

const DEFS: { key: TimeseriesKey; title: string; hint: string }[] = [
  { key: 'demand',       title: 'Demand',                hint: 'datetime + one column per demand unit (MW)' },
  { key: 'availability', title: 'Renewable availability', hint: 'datetime + columns per technology (0 to 1)' },
  { key: 'fuelPrices',   title: 'Fuel prices',           hint: 'fuel + price, or a datetime series' },
]

function parseCsv(text: string): { columns: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (!lines.length) return { columns: [], rows: [] }
  return {
    columns: lines[0].split(',').map(s => s.trim()),
    rows: lines.slice(1).map(l => l.split(',')),
  }
}

function previewData(entry: TimeseriesEntry) {
  const { columns, rows } = parseCsv(entry.csv)
  const valCol = columns.length > 1 ? 1 : 0
  return rows.slice(0, 240).map((r, i) => ({ i, v: parseFloat(r[valCol]) || 0 }))
}

function Card({ def }: { def: (typeof DEFS)[number] }) {
  const { timeseries, setTimeseries } = useStudio()
  const entry = timeseries[def.key]
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const csv = String(reader.result || '')
      const { columns, rows } = parseCsv(csv)
      setTimeseries(def.key, { fileName: f.name, csv, columns, rowCount: rows.length })
    }
    reader.readAsText(f)
  }

  return (
    <div className="rounded-xl border border-cg-border bg-cg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={15} className="text-cg-primary" />
        <span className="text-sm font-bold text-cg-txt">{def.title}</span>
        {entry && <CheckCircle2 size={14} className="text-emerald-400 ml-auto" />}
      </div>
      <p className="text-[11px] text-cg-faint">{def.hint}</p>

      <input ref={inputRef} type="file" accept=".csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <button onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-cg-border text-xs text-cg-muted hover:text-cg-txt hover:border-cg-primary/50 transition-colors">
        <Upload size={13} /> {entry ? 'Replace CSV' : 'Upload CSV'}
      </button>

      {entry && (
        <>
          <p className="text-[11px] text-cg-muted truncate">
            {entry.fileName} · {entry.rowCount} rows · {entry.columns.length} cols
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={previewData(entry)}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                <Line type="monotone" dataKey="v" stroke="#10B981" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

export default function TimeseriesStep() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-cg-txt mb-1">Timeseries inputs</h2>
        <p className="text-sm text-cg-muted">
          Provide real demand, renewable availability and fuel prices. Without these,
          the simulation falls back to a synthetic demand curve.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {DEFS.map(d => <Card key={d.key} def={d} />)}
      </div>
      <p className="text-[11px] text-cg-faint">
        Uploaded series are previewed here. Feeding them into the run is the next step of the rollout.
      </p>
    </div>
  )
}

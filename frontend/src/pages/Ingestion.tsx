import { useState } from 'react'
import { Upload, FileText, Search, Filter } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge, { statusVariant } from '../components/ui/Badge'
import { mockIngestionRecords } from '../mock'
import type { FileFormat, IngestionStatus } from '../types'

const FORMATS: FileFormat[] = ['CSV', 'Excel', 'JSON', 'XML']
const STATUSES: IngestionStatus[] = ['Processing', 'Success', 'Error']

const FORMAT_COLORS: Record<FileFormat, string> = {
  CSV:   'bg-green-500/15 text-green-400 border border-green-500/30',
  Excel: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  JSON:  'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  XML:   'bg-purple-500/15 text-purple-400 border border-purple-500/30',
}

export default function Ingestion() {
  const [search, setSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState<FileFormat | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<IngestionStatus | 'All'>('All')
  const [dragging, setDragging] = useState(false)

  const filtered = mockIngestionRecords.filter((r) => {
    const matchSearch = r.filename.toLowerCase().includes(search.toLowerCase())
    const matchFormat = formatFilter === 'All' || r.format === formatFilter
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchFormat && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <Card title="Upload Data">
        <div className="p-5">
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setDragging(false) }}
            className={`
              border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4
              transition-all cursor-pointer
              ${dragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-cg-border hover:border-blue-500/50 hover:bg-cg-s2'
              }
            `}
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Upload size={24} className="text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-cg-txt">Drop files here or click to upload</p>
              <p className="text-xs text-cg-muted mt-1">Maximum file size: 500 MB</p>
            </div>
            {/* Format badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {FORMATS.map((fmt) => (
                <span key={fmt} className={`px-3 py-1 rounded-full text-xs font-medium ${FORMAT_COLORS[fmt]}`}>
                  {fmt}
                </span>
              ))}
            </div>
            <button className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
              Browse Files
            </button>
          </div>
        </div>
      </Card>

      {/* Upload history */}
      <Card title="Upload History">
        {/* Filters */}
        <div className="px-5 py-3 border-b border-cg-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename..."
              className="w-full pl-9 pr-3 py-2 bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-cg-muted" />
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as FileFormat | 'All')}
              className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Formats</option>
              {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IngestionStatus | 'All')}
              className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                {['Filename', 'Format', 'Size', 'Status', 'Date', 'Rows Ingested'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-cg-border/50 hover:bg-cg-s2 transition-colors ${i % 2 === 0 ? '' : 'bg-cg-stripe'}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-cg-muted flex-shrink-0" />
                      <span className="text-cg-txt font-medium text-sm">{row.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${FORMAT_COLORS[row.format]}`}>
                      {row.format}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-cg-muted">{row.size}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-cg-muted whitespace-nowrap">{row.date}</td>
                  <td className="px-5 py-3.5 text-cg-muted">
                    {row.rowsIngested !== null ? row.rowsIngested.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-cg-faint text-sm">
                    No records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

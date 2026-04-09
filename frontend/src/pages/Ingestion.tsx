import { useState } from 'react'
import { Upload, FileText, Search, Filter, CloudUpload } from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge, statusBadge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { mockIngestionRecords } from '../mock'
import type { FileFormat, IngestionStatus } from '../types'

const FORMATS: FileFormat[] = ['CSV', 'Excel', 'JSON', 'XML']
const STATUSES: IngestionStatus[] = ['Processing', 'Success', 'Error']

const FORMAT_COLORS: Record<FileFormat, string> = {
  CSV:   'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  Excel: 'bg-green-500/15   text-green-500   border border-green-500/30',
  JSON:  'bg-amber-500/15   text-amber-500   border border-amber-500/30',
  XML:   'bg-violet-500/15  text-violet-500  border border-violet-500/30',
}

export default function Ingestion() {
  const [search, setSearch]             = useState('')
  const [formatFilter, setFormatFilter] = useState<FileFormat | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<IngestionStatus | 'All'>('All')
  const [dragging, setDragging]         = useState(false)

  const filtered = mockIngestionRecords.filter(r => {
    const matchSearch = r.filename.toLowerCase().includes(search.toLowerCase())
    const matchFormat = formatFilter === 'All' || r.format === formatFilter
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchFormat && matchStatus
  })

  const success = mockIngestionRecords.filter(r => r.status === 'Success').length
  const errors  = mockIngestionRecords.filter(r => r.status === 'Error').length
  const totalRows  = mockIngestionRecords
    .filter(r => r.rowsIngested)
    .reduce((s, r) => s + (r.rowsIngested ?? 0), 0)

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Ingested" value={mockIngestionRecords.length} icon={<Upload   size={17}/>} iconColor="#6366F1" />
        <StatCard label="Rows Processed" value={totalRows.toLocaleString()} icon={<FileText size={17}/>} iconColor="#10B981" />
        <StatCard label="Successful"     value={success}    icon={<Upload   size={17}/>} iconColor="#10B981" />
        <StatCard label="Errors"         value={errors}     icon={<FileText size={17}/>} iconColor="#EF4444" />
      </div>

      {/* Drop zone */}
      <Card title="Upload Data">
        <div className="p-5">
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setDragging(false) }}
            className={`
              border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4
              cursor-pointer transition-all duration-200
              ${dragging
                ? 'border-cg-primary bg-cg-primary-s'
                : 'border-cg-border hover:border-cg-primary/50 hover:bg-cg-s2'
              }
            `}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              dragging ? 'gradient-primary shadow-cg scale-110' : 'bg-cg-primary-s'
            }`}>
              <CloudUpload size={24} className={dragging ? 'text-white' : 'text-cg-primary'} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-cg-txt">
                {dragging ? 'Drop to upload' : 'Drop files here or click to upload'}
              </p>
              <p className="text-xs text-cg-muted mt-1">Maximum file size: 500 MB per file</p>
            </div>
            {/* Format badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {FORMATS.map(fmt => (
                <span key={fmt} className={`px-3 py-1 rounded-full text-xs font-medium ${FORMAT_COLORS[fmt]}`}>
                  {fmt}
                </span>
              ))}
            </div>
            <button className="px-5 py-2 rounded-xl text-sm font-semibold gradient-primary text-white shadow-cg hover:opacity-90 transition-all">
              Browse Files
            </button>
          </div>
        </div>
      </Card>

      {/* History table */}
      <Card title="Upload History">
        {/* Filters */}
        <div className="px-5 py-3.5 border-b border-cg-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search filename…"
              className="w-full pl-8 pr-3 py-2 bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt
                placeholder:text-cg-faint focus:outline-none focus:border-cg-primary
                focus:ring-2 focus:ring-cg-primary/15 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-cg-muted shrink-0" />
            <select
              value={formatFilter}
              onChange={e => setFormatFilter(e.target.value as FileFormat | 'All')}
              className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2
                focus:outline-none focus:border-cg-primary transition-all"
            >
              <option value="All">All Formats</option>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as IngestionStatus | 'All')}
              className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2
                focus:outline-none focus:border-cg-primary transition-all"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <span className="ml-auto text-xs text-cg-faint self-center">
            {filtered.length} of {mockIngestionRecords.length} records
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                {['Filename', 'Format', 'Size', 'Status', 'Date', 'Rows Ingested'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-b border-cg-border/50 hover:bg-cg-s2 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-cg-muted shrink-0" />
                      <span className="text-cg-txt font-medium text-sm">{row.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${FORMAT_COLORS[row.format]}`}>
                      {row.format}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-cg-muted text-xs">{row.size}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusBadge(row.status)} dot>{row.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-cg-muted whitespace-nowrap text-xs">{row.date}</td>
                  <td className="px-5 py-3.5 text-cg-muted font-mono text-xs">
                    {row.rowsIngested !== null ? row.rowsIngested.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-cg-faint text-sm">
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

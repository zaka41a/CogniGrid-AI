import { useState } from 'react'
import { FileText, FileSpreadsheet, File, Image, Code, Search, Upload, Trash2, Eye, FolderOpen } from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'

interface Document {
  id: string
  name: string
  type: 'pdf' | 'csv' | 'docx' | 'image' | 'code' | 'other'
  size: string
  status: 'processed' | 'processing' | 'failed'
  nodes: number
  uploadedAt: string
}

const MOCK_DOCS: Document[] = [
  { id: '1', name: 'Annual_Report_2024.pdf',    type: 'pdf',   size: '4.2 MB', status: 'processed',  nodes: 312, uploadedAt: '2026-04-04' },
  { id: '2', name: 'Sales_Data_Q1.csv',          type: 'csv',   size: '1.8 MB', status: 'processed',  nodes: 890, uploadedAt: '2026-04-04' },
  { id: '3', name: 'Technical_Specs.docx',       type: 'docx',  size: '890 KB', status: 'processed',  nodes: 145, uploadedAt: '2026-04-03' },
  { id: '4', name: 'Architecture_Diagram.png',   type: 'image', size: '2.1 MB', status: 'processing', nodes: 0,   uploadedAt: '2026-04-03' },
  { id: '5', name: 'backend_src.zip',            type: 'code',  size: '5.6 MB', status: 'processed',  nodes: 534, uploadedAt: '2026-04-02' },
  { id: '6', name: 'Contracts_March_2026.pdf',   type: 'pdf',   size: '3.3 MB', status: 'failed',     nodes: 0,   uploadedAt: '2026-04-02' },
  { id: '7', name: 'Customer_Feedback.csv',      type: 'csv',   size: '720 KB', status: 'processed',  nodes: 241, uploadedAt: '2026-04-01' },
  { id: '8', name: 'Product_Roadmap_2026.docx',  type: 'docx',  size: '1.1 MB', status: 'processed',  nodes: 198, uploadedAt: '2026-04-01' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FILE_ICONS: Record<Document['type'], any> = {
  pdf: FileText, csv: FileSpreadsheet, docx: FileText,
  image: Image, code: Code, other: File,
}

const FILE_COLORS: Record<Document['type'], string> = {
  pdf:   'text-red-500   bg-red-500/10',
  csv:   'text-emerald-500 bg-emerald-500/10',
  docx:  'text-indigo-500 bg-indigo-500/10',
  image: 'text-violet-500 bg-violet-500/10',
  code:  'text-amber-500  bg-amber-500/10',
  other: 'text-cg-muted   bg-cg-s2',
}

const STATUS_VARIANT: Record<Document['status'], 'success' | 'warning' | 'danger'> = {
  processed:  'success',
  processing: 'warning',
  failed:     'danger',
}

export default function Documents() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Document['status']>('all')

  const filtered = MOCK_DOCS.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || d.status === filter
    return matchSearch && matchFilter
  })

  const processed  = MOCK_DOCS.filter(d => d.status === 'processed')
  const totalNodes = processed.reduce((s, d) => s + d.nodes, 0)

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={MOCK_DOCS.length}     icon={<FileText size={17}/>}        iconColor="#6366F1" />
        <StatCard label="Graph Nodes"     value={totalNodes.toLocaleString()} icon={<FolderOpen size={17}/>} iconColor="#10B981" />
        <StatCard label="Processed"       value={processed.length}            icon={<FileText size={17}/>}        iconColor="#10B981" />
        <StatCard label="Pending / Failed" value={MOCK_DOCS.length - processed.length} icon={<File size={17}/>} iconColor="#F59E0B" />
      </div>

      {/* Table card */}
      <Card>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-cg-border flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cg-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-cg-bg border border-cg-border rounded-lg pl-8 pr-3 py-2 text-sm text-cg-txt
                placeholder:text-cg-faint focus:outline-none focus:border-cg-primary focus:ring-2
                focus:ring-cg-primary/15 transition-all"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'processed', 'processing', 'failed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filter === f
                    ? 'bg-cg-primary-s text-cg-primary border border-cg-primary/30'
                    : 'text-cg-muted hover:text-cg-txt hover:bg-cg-s2'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            gradient-primary text-white shadow-cg hover:opacity-90 transition-all ml-auto">
            <Upload size={14} /> Upload
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                {['File', 'Type', 'Size', 'Status', 'Nodes', 'Uploaded', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const Icon = FILE_ICONS[doc.type]
                return (
                  <tr key={doc.id} className="border-b border-cg-border/50 hover:bg-cg-s2 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${FILE_COLORS[doc.type]}`}>
                          <Icon size={13} />
                        </div>
                        <span className="text-cg-txt font-medium truncate max-w-[220px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-cg-muted uppercase text-[11px] font-mono tracking-wide">{doc.type}</span>
                    </td>
                    <td className="px-5 py-3.5 text-cg-muted text-xs">{doc.size}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={STATUS_VARIANT[doc.status]} dot>{doc.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-cg-muted font-mono text-xs">
                      {doc.status === 'processed' ? doc.nodes.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-cg-faint text-xs whitespace-nowrap">{doc.uploadedAt}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-border transition-colors" title="Preview">
                          <Eye size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg text-cg-muted hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <EmptyState
              icon={<Search size={28} />}
              title="No documents found"
              description="Try adjusting your search or filter."
            />
          )}
        </div>

        <div className="px-5 py-3 border-t border-cg-border flex items-center justify-between">
          <p className="text-xs text-cg-faint">{filtered.length} of {MOCK_DOCS.length} documents</p>
          <p className="text-xs text-cg-faint">{totalNodes.toLocaleString()} total nodes extracted</p>
        </div>
      </Card>
    </div>
  )
}

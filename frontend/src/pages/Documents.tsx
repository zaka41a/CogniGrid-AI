import { useState, useEffect, useCallback } from 'react'
import { FileText, FileSpreadsheet, File, Image, Code, Search, Upload, Trash2, RefreshCw, FolderOpen } from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'
import { graphApi, ingestionApi } from '../lib/api'

interface Document {
  id: string
  name: string
  type: 'pdf' | 'csv' | 'docx' | 'image' | 'code' | 'other'
  size: string
  status: 'processed' | 'processing' | 'failed'
  nodes: number
  uploadedAt: string
}

function guessType(name: string): Document['type'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')  return 'pdf'
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'csv'
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'docx'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image'
  if (['js', 'ts', 'py', 'go', 'java', 'zip'].includes(ext)) return 'code'
  return 'other'
}

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
  const [docs, setDocs]       = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<'all' | Document['status']>('all')

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      // Load from graph service (processed docs) and ingestion jobs simultaneously
      const [graphRes, jobsRes] = await Promise.allSettled([
        graphApi.documents(),
        ingestionApi.jobs(),
      ])

      const docMap = new Map<string, Document>()

      // Graph docs (fully processed)
      if (graphRes.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = Array.isArray(graphRes.value.data) ? graphRes.value.data : []
        items.forEach((d: any) => {
          docMap.set(d.id ?? d.documentId, {
            id:         d.id ?? d.documentId,
            name:       d.name ?? d.filename ?? d.title ?? d.id,
            type:       guessType(d.name ?? d.filename ?? ''),
            size:       d.size ? `${(d.size / 1024 / 1024).toFixed(1)} MB` : '—',
            status:     'processed',
            nodes:      d.nodeCount ?? d.nodes ?? 0,
            uploadedAt: d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : '—',
          })
        })
      }

      // Ingestion jobs (may include in-progress / failed)
      if (jobsRes.status === 'fulfilled') {
        jobsRes.value.data.forEach(j => {
          if (!docMap.has(j.jobId)) {
            docMap.set(j.jobId, {
              id:         j.jobId,
              name:       j.filename,
              type:       guessType(j.filename),
              size:       '—',
              status:     j.status === 'done' ? 'processed' : j.status === 'error' ? 'failed' : 'processing',
              nodes:      0,
              uploadedAt: j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : '—',
            })
          }
        })
      }

      setDocs([...docMap.values()])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document from the knowledge graph?')) return
    setDeleting(id)
    try {
      await graphApi.deleteDoc(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch {
      alert('Failed to delete document.')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = docs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || d.status === filter
    return matchSearch && matchFilter
  })

  const processed  = docs.filter(d => d.status === 'processed')
  const totalNodes = processed.reduce((s, d) => s + d.nodes, 0)

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={loading ? '…' : docs.length}
          icon={<FileText size={17}/>} iconColor="#6366F1" />
        <StatCard label="Graph Nodes" value={loading ? '…' : totalNodes.toLocaleString()}
          icon={<FolderOpen size={17}/>} iconColor="#10B981" />
        <StatCard label="Processed" value={loading ? '…' : processed.length}
          icon={<FileText size={17}/>} iconColor="#10B981" />
        <StatCard label="Pending / Failed" value={loading ? '…' : docs.length - processed.length}
          icon={<File size={17}/>} iconColor="#F59E0B" />
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
          <button
            onClick={loadDocs}
            className="p-2 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => window.location.href = '/app/ingestion'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              gradient-primary text-white shadow-cg hover:opacity-90 transition-all ml-auto"
          >
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
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-cg-faint text-sm">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map(doc => {
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
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                          className="p-1.5 rounded-lg text-cg-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <EmptyState
              icon={<Search size={28} />}
              title="No documents found"
              description={docs.length === 0 ? 'Upload a document in Data Ingestion to get started.' : 'Try adjusting your search or filter.'}
            />
          )}
        </div>

        <div className="px-5 py-3 border-t border-cg-border flex items-center justify-between">
          <p className="text-xs text-cg-faint">{filtered.length} of {docs.length} documents</p>
          <p className="text-xs text-cg-faint">{totalNodes.toLocaleString()} total nodes extracted</p>
        </div>
      </Card>
    </div>
  )
}

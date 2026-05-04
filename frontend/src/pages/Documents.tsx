import { useState, useEffect, useCallback, useMemo } from 'react'
import { FileText, FileSpreadsheet, File, Image, Code, Search, Upload, Trash2, RefreshCw, FolderOpen, ArrowUp, ArrowDown, X, Network } from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'
import { ingestionApi, ingestHttp } from '../lib/api'
import type { IngestJob } from '../lib/api'
import { useDeepLink } from '../hooks/useDeepLink'

interface Document {
  id:         string
  name:       string
  type:       'pdf' | 'csv' | 'docx' | 'image' | 'code' | 'other'
  size:       string
  sizeBytes:  number
  status:     'processed' | 'processing' | 'failed'
  nodes:      number
  chunks:     number
  uploadedAt: string
  uploadedAtIso: string
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

type SortKey = 'name' | 'type' | 'size' | 'status' | 'nodes' | 'date'

function fmtRelative(iso: string): string {
  if (!iso) return ''
  const ms = Date.now() - Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const m = Math.floor(ms / 60_000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function Documents() {
  const link = useDeepLink<{ docId: string }>()
  const [docs, setDocs]       = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<'all' | Document['status']>('all')
  const [sort, setSort]       = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewBody, setPreviewBody] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await ingestHttp.get<{ jobs: IngestJob[]; total: number }>('/api/ingestion/jobs', { timeout: 8_000 })
      const jobs = data.jobs ?? []
      setDocs(jobs.map(j => {
        const bytes = j.file_size ?? 0
        const sizeStr = bytes > 0
          ? bytes > 1024 * 1024
            ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
            : `${(bytes / 1024).toFixed(1)} KB`
          : ''
        return {
          id:        j.id,
          name:      j.file_name,
          type:      guessType(j.file_name),
          size:      sizeStr,
          sizeBytes: bytes,
          status:    j.status === 'completed' ? 'processed' : j.status === 'failed' ? 'failed' : 'processing',
          nodes:     j.nodes_extracted ?? 0,
          chunks:    j.chunks_indexed ?? 0,
          uploadedAt:    j.created_at ? fmtRelative(j.created_at) : '',
          uploadedAtIso: j.created_at ?? '',
        }
      }))
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocs() }, [loadDocs])

  // Honour deep link from other pages (e.g. "Show in graph" action)
  useEffect(() => {
    const { state } = link.consume()
    if (state?.docId) setPreviewId(state.docId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    setDeleting(id)
    try {
      await ingestionApi.deleteJob(id)
      setDocs(prev => prev.filter(d => d.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch {
      alert('Failed to delete document.')
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} document${selected.size > 1 ? 's' : ''}?`)) return
    setDeleting('__bulk__')
    try {
      await Promise.allSettled(Array.from(selected).map(id => ingestionApi.deleteJob(id)))
      setDocs(prev => prev.filter(d => !selected.has(d.id)))
      setSelected(new Set())
    } finally {
      setDeleting(null)
    }
  }

  const toggleSort = (key: SortKey) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'name' || key === 'type' ? 'asc' : 'desc' })
  }

  const filtered = useMemo(() => {
    const matches = docs.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || d.status === filter
      return matchSearch && matchFilter
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    matches.sort((a, b) => {
      switch (sort.key) {
        case 'name':   return dir * a.name.localeCompare(b.name)
        case 'type':   return dir * a.type.localeCompare(b.type)
        case 'size':   return dir * (a.sizeBytes - b.sizeBytes)
        case 'status': return dir * a.status.localeCompare(b.status)
        case 'nodes':  return dir * (a.nodes - b.nodes)
        case 'date':   return dir * (Date.parse(a.uploadedAtIso || '0') - Date.parse(b.uploadedAtIso || '0'))
      }
    })
    return matches
  }, [docs, search, filter, sort])

  const allChecked = filtered.length > 0 && filtered.every(d => selected.has(d.id))
  const toggleAll = () => {
    setSelected(prev => {
      if (allChecked) {
        const n = new Set(prev)
        filtered.forEach(d => n.delete(d.id))
        return n
      }
      const n = new Set(prev)
      filtered.forEach(d => n.add(d.id))
      return n
    })
  }

  const processed  = docs.filter(d => d.status === 'processed')
  const totalNodes = processed.reduce((s, d) => s + d.nodes, 0)

  // Preview side panel — fetches the first chunks of the selected doc.
  const previewDoc = docs.find(d => d.id === previewId)
  useEffect(() => {
    if (!previewId) { setPreviewBody(''); return }
    setPreviewLoading(true)
    ingestHttp.get<{ chunks?: Array<{ text: string }> }>(`/api/ingestion/jobs/${previewId}/preview`, { timeout: 6_000 })
      .then(r => {
        const text = (r.data.chunks ?? []).map(c => c.text).slice(0, 5).join('\n\n---\n\n')
        setPreviewBody(text || '(no preview content available)')
      })
      .catch(() => setPreviewBody('(preview endpoint unavailable — content may not be indexed yet)'))
      .finally(() => setPreviewLoading(false))
  }, [previewId])

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap cursor-pointer hover:text-cg-txt transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === k && (sort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
      </span>
    </th>
  )

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={loading ? '…' : docs.length}
          icon={<FileText size={17}/>} iconColor="#6366F1" />
        <StatCard label="Total Nodes" value={loading ? '…' : totalNodes.toLocaleString()}
          icon={<FolderOpen size={17}/>} iconColor="#10B981" />
        <StatCard label="Processed" value={loading ? '…' : processed.length}
          icon={<FileText size={17}/>} iconColor="#10B981" />
        <StatCard label="Pending / Failed" value={loading ? '…' : docs.length - processed.length}
          icon={<File size={17}/>} iconColor="#F59E0B" />
      </div>

      <div className={previewId ? 'grid grid-cols-1 xl:grid-cols-3 gap-4' : ''}>

      {/* Table card */}
      <Card className={previewId ? 'xl:col-span-2' : ''}>
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
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting === '__bulk__'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
            >
              <Trash2 size={12} />
              Delete {selected.size}
            </button>
          )}
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
                <th className="px-3 py-3 w-9">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="cursor-pointer accent-cg-primary"
                    aria-label="Select all"
                  />
                </th>
                <SortHeader k="name"   label="File" />
                <SortHeader k="type"   label="Type" />
                <SortHeader k="size"   label="Size" />
                <SortHeader k="status" label="Status" />
                <SortHeader k="nodes"  label="Nodes" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">Chunks</th>
                <SortHeader k="date"   label="Uploaded" />
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-cg-faint text-sm">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map(doc => {
                const Icon = FILE_ICONS[doc.type]
                const isSelected = selected.has(doc.id)
                return (
                  <tr
                    key={doc.id}
                    className={`border-b border-cg-border/50 hover:bg-cg-s2 transition-colors group cursor-pointer ${previewId === doc.id ? 'bg-cg-primary-s/30' : ''}`}
                    onClick={() => setPreviewId(prev => prev === doc.id ? null : doc.id)}
                  >
                    <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelected(prev => {
                          const n = new Set(prev)
                          if (n.has(doc.id)) n.delete(doc.id); else n.add(doc.id)
                          return n
                        })}
                        className="cursor-pointer accent-cg-primary"
                      />
                    </td>
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
                      {doc.status === 'processed' ? doc.nodes.toLocaleString() : ''}
                    </td>
                    <td className="px-5 py-3.5 text-cg-muted font-mono text-xs">
                      {doc.chunks > 0 ? doc.chunks.toLocaleString() : ''}
                    </td>
                    <td className="px-5 py-3.5 text-cg-faint text-xs whitespace-nowrap">{doc.uploadedAt}</td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => link.go('/app/graph', { docId: doc.id } as never)}
                          className="p-1.5 rounded-lg text-cg-muted hover:text-cg-primary hover:bg-cg-primary-s transition-colors"
                          title="Show in graph"
                        >
                          <Network size={13} />
                        </button>
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

      {/* Inline preview side panel */}
      {previewId && (
        <Card title={previewDoc?.name ?? 'Preview'} action={
          <button
            onClick={() => setPreviewId(null)}
            className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
          >
            <X size={13} />
          </button>
        }>
          <div className="p-4 space-y-3 max-h-[500px] overflow-auto">
            {previewLoading ? (
              <div className="text-center text-cg-faint text-xs py-8">Loading preview…</div>
            ) : (
              <pre className="text-[11px] text-cg-muted whitespace-pre-wrap leading-relaxed font-mono">{previewBody}</pre>
            )}
          </div>
        </Card>
      )}

      </div>
    </div>
  )
}

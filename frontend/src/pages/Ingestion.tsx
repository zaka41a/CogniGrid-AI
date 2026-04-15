import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, FileText, Search, Filter, CloudUpload, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react'
import Card from '../components/ui/Card'
import { Badge, statusBadge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { ingestionApi } from '../lib/api'
import type { IngestJob } from '../lib/api'
import { useAppStore } from '../store'

const FORMAT_COLORS: Record<string, string> = {
  CSV:   'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  Excel: 'bg-green-500/15   text-green-500   border border-green-500/30',
  JSON:  'bg-amber-500/15   text-amber-500   border border-amber-500/30',
  XML:   'bg-violet-500/15  text-violet-500  border border-violet-500/30',
  PDF:   'bg-red-500/15     text-red-500     border border-red-500/30',
  Other: 'bg-cg-s2          text-cg-muted    border border-cg-border',
}

function guessFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'Other'
  if (['CSV'].includes(ext))         return 'CSV'
  if (['XLS', 'XLSX'].includes(ext)) return 'Excel'
  if (['JSON'].includes(ext))        return 'JSON'
  if (['XML'].includes(ext))         return 'XML'
  if (['PDF'].includes(ext))         return 'PDF'
  return 'Other'
}

interface UploadState {
  file:     File
  progress: number
  status:   'uploading' | 'done' | 'error'
  error?:   string
}

export default function Ingestion() {
  const { addNotification, incrementUploads } = useAppStore()
  const [jobs, setJobs]               = useState<IngestJob[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [dragging, setDragging]       = useState(false)
  const [uploads, setUploads]         = useState<UploadState[]>([])
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const { data } = await ingestionApi.jobs()
      // Backend returns { jobs: [...], total: N }
      setJobs(data.jobs ?? [])
    } catch {
      // If backend not running, keep existing jobs
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll while any job is in-progress
  useEffect(() => {
    loadJobs()
    pollRef.current = setInterval(() => {
      if (jobs.some(j => j.status === 'pending' || j.status === 'processing')) {
        loadJobs()
      }
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    for (const file of fileArr) {
      const idx = uploads.length
      setUploads(prev => [...prev, { file, progress: 0, status: 'uploading' }])
      try {
        await ingestionApi.upload(file, (pct) => {
          setUploads(prev => prev.map((u, i) => i === idx ? { ...u, progress: pct } : u))
        })
        setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'done', progress: 100 } : u))
        incrementUploads()
        addNotification({
          title: 'Upload successful',
          message: `${file.name} is being processed`,
          time: 'Just now',
          read: false,
          type: 'success',
        })
        await loadJobs()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          ?? (err as { message?: string })?.message
          ?? 'Upload failed — check that the ingestion service is running'
        setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'error', error: msg } : u))
        addNotification({
          title: 'Upload failed',
          message: `${file.name}: ${msg}`,
          time: 'Just now',
          read: false,
          type: 'critical',
        })
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files)
    // Reset input so the same file can be re-uploaded
    e.target.value = ''
  }

  const filtered = jobs.filter(j => {
    const matchSearch = j.file_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  const success     = jobs.filter(j => j.status === 'completed').length
  const errors      = jobs.filter(j => j.status === 'failed').length
  const inProgress  = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length

  function statusLabel(s: IngestJob['status']): string {
    if (s === 'completed') return 'Success'
    if (s === 'failed')    return 'Error'
    return 'Processing'
  }

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Jobs"  value={loading ? '…' : jobs.length}   icon={<Upload   size={17}/>} iconColor="#6366F1" />
        <StatCard label="Completed"   value={loading ? '…' : success}        icon={<FileText size={17}/>} iconColor="#10B981" />
        <StatCard label="In Progress" value={loading ? '…' : inProgress}     icon={<Upload   size={17}/>} iconColor="#F59E0B" />
        <StatCard label="Errors"      value={loading ? '…' : errors}         icon={<FileText size={17}/>} iconColor="#EF4444" />
      </div>

      {/* Drop zone */}
      <Card title="Upload Data">
        <div className="p-5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.csv,.json,.xml,.xlsx,.xls,.docx,.txt,.md,.png,.jpg,.jpeg"
          />
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
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
              <p className="text-xs text-cg-muted mt-1">PDF, CSV, JSON, XML, Excel, images · Max 100 MB</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['PDF', 'CSV', 'JSON', 'XML', 'Excel'].map(fmt => (
                <span key={fmt} className={`px-3 py-1 rounded-full text-xs font-medium ${FORMAT_COLORS[fmt]}`}>
                  {fmt}
                </span>
              ))}
            </div>
            <button
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="px-5 py-2 rounded-xl text-sm font-semibold gradient-primary text-white shadow-cg hover:opacity-90 transition-all"
            >
              Browse Files
            </button>
          </div>

          {/* Upload progress */}
          {uploads.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploads.map((u, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-all ${
                  u.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                  u.status === 'done'  ? 'bg-emerald-500/5 border-emerald-500/20' :
                  'bg-cg-bg border-cg-border'
                }`}>
                  {u.status === 'done'  && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                  {u.status === 'error' && <AlertCircle  size={14} className="text-red-500 shrink-0" />}
                  {u.status === 'uploading' && <FileText size={14} className="text-cg-muted shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-cg-txt truncate">{u.file.name}</p>
                    {u.status === 'uploading' && (
                      <div className="mt-1.5 h-1 bg-cg-border rounded-full overflow-hidden">
                        <div className="h-full bg-cg-primary rounded-full transition-all" style={{ width: `${u.progress}%` }} />
                      </div>
                    )}
                    {u.status === 'error' && (
                      <p className="text-[10px] text-red-500 mt-0.5">{u.error}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    u.status === 'done'     ? 'text-emerald-500' :
                    u.status === 'error'    ? 'text-red-500' :
                    'text-amber-500'
                  }`}>
                    {u.status === 'uploading' ? `${u.progress}%` : u.status === 'done' ? 'Done' : 'Failed'}
                  </span>
                  <button
                    onClick={() => setUploads(prev => prev.filter((_, j) => j !== i))}
                    className="text-cg-faint hover:text-cg-muted transition-colors p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-cg-bg border border-cg-border rounded-lg text-sm text-cg-txt px-3 py-2
                focus:outline-none focus:border-cg-primary transition-all"
            >
              <option value="All">All Statuses</option>
              {['pending', 'processing', 'completed', 'failed'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadJobs}
            className="p-2 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="ml-auto text-xs text-cg-faint self-center">
            {filtered.length} of {jobs.length} records
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-border">
                {['Filename', 'Format', 'Status', 'Progress', 'Nodes'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-cg-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-cg-faint text-sm">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map(job => (
                <tr key={job.id} className="border-b border-cg-border/50 hover:bg-cg-s2 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-cg-muted shrink-0" />
                      <span className="text-cg-txt font-medium text-sm">{job.file_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${FORMAT_COLORS[guessFormat(job.file_name)]}`}>
                      {guessFormat(job.file_name)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusBadge(statusLabel(job.status))} dot>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-cg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            job.status === 'completed' ? 'bg-emerald-500' :
                            job.status === 'failed'    ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${job.status === 'completed' ? 100 : job.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-cg-faint font-mono">
                        {job.status === 'completed' ? '100' : job.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-cg-muted text-xs">
                    {job.nodes_extracted ?? '—'}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-cg-faint text-sm">
                    {jobs.length === 0
                      ? 'No uploads yet. Drop a file above to get started.'
                      : 'No records match your filters.'}
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

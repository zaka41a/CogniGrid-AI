import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id:      string
  type:    ToastType
  title:   string
  message?: string
}

interface ToastCtx {
  toast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-cg-secondary shrink-0" />,
  error:   <XCircle      size={16} className="text-cg-danger   shrink-0" />,
  warning: <AlertTriangle size={16} className="text-cg-warning  shrink-0" />,
  info:    <Info          size={16} className="text-cg-info     shrink-0" />,
}

const barColors: Record<ToastType, string> = {
  success: 'bg-cg-secondary',
  error:   'bg-cg-danger',
  warning: 'bg-cg-warning',
  info:    'bg-cg-info',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, type, title, message }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const ctx: ToastCtx = {
    toast,
    success: (t, m) => toast('success', t, m),
    error:   (t, m) => toast('error', t, m),
    warning: (t, m) => toast('warning', t, m),
    info:    (t, m) => toast('info', t, m),
  }

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {/* Portal-like fixed stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto card shadow-cg-md overflow-hidden anim-slide-r"
          >
            <div className={`h-0.5 w-full ${barColors[t.type]}`} />
            <div className="flex items-start gap-3 px-4 py-3">
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cg-txt">{t.title}</p>
                {t.message && <p className="text-xs text-cg-muted mt-0.5">{t.message}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-cg-faint hover:text-cg-txt transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

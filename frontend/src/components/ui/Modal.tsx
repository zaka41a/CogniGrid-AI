import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open:       boolean
  onClose:    () => void
  title?:     string
  children:   ReactNode
  footer?:    ReactNode
  size?:      'sm' | 'md' | 'lg' | 'xl' | 'full'
  hideClose?: boolean
}

const sizes = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-5xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'md', hideClose }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm anim-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={[
        'relative w-full card shadow-cg-lg anim-scale-in',
        'flex flex-col max-h-[90vh]',
        sizes[size],
      ].join(' ')}>

        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-cg-border shrink-0">
            {title && <h2 className="text-base font-semibold text-cg-txt">{title}</h2>}
            {!hideClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-cg-muted hover:text-cg-txt hover:bg-cg-s2 transition-colors ml-auto"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-5 py-4 border-t border-cg-border flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

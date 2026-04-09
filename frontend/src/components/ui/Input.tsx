import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  hint?:     string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  onIconRightClick?: () => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, iconLeft, iconRight, onIconRightClick,
  className = '', id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-cg-txt2">
          {label}
          {props.required && <span className="text-cg-danger ml-1">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {iconLeft && (
          <span className="absolute left-3 text-cg-muted pointer-events-none">
            {iconLeft}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full h-9 bg-cg-surface border rounded-xl px-3 text-sm text-cg-txt',
            'placeholder:text-cg-faint',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-cg-primary focus:ring-offset-0 focus:border-cg-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error  ? 'border-cg-danger focus:ring-cg-danger' : 'border-cg-border',
            iconLeft  ? 'pl-9'  : '',
            iconRight ? 'pr-9'  : '',
            className,
          ].join(' ')}
          {...props}
        />

        {iconRight && (
          <button
            type="button"
            onClick={onIconRightClick}
            className="absolute right-3 text-cg-muted hover:text-cg-txt transition-colors"
          >
            {iconRight}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-cg-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-cg-muted">{hint}</p>}
    </div>
  )
})
Input.displayName = 'Input'

/* Textarea variant */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?:  string
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, hint, className = '', id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-cg-txt2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={[
          'w-full bg-cg-surface border rounded-xl px-3 py-2 text-sm text-cg-txt resize-none',
          'placeholder:text-cg-faint transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-cg-primary focus:border-cg-primary',
          error ? 'border-cg-danger' : 'border-cg-border',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-cg-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-cg-muted">{hint}</p>}
    </div>
  )
})
Textarea.displayName = 'Textarea'

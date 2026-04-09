import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:  'gradient-primary text-white shadow-cg hover:opacity-90 active:scale-[0.98]',
  secondary:'bg-cg-secondary text-white shadow-cg hover:opacity-90 active:scale-[0.98]',
  ghost:    'bg-transparent text-cg-txt hover:bg-cg-hover active:scale-[0.98]',
  danger:   'bg-cg-danger text-white shadow-cg hover:opacity-90 active:scale-[0.98]',
  outline:  'bg-transparent border border-cg-border text-cg-txt hover:bg-cg-hover active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  xs: 'h-7  px-2.5 text-xs  gap-1.5 rounded-lg',
  sm: 'h-8  px-3   text-sm  gap-1.5 rounded-lg',
  md: 'h-9  px-4   text-sm  gap-2   rounded-xl',
  lg: 'h-11 px-6   text-base gap-2   rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  icon,
  iconRight,
  fullWidth= false,
  disabled,
  children,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cg-primary focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin shrink-0" />
        : icon && <span className="shrink-0">{icon}</span>
      }
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
})
Button.displayName = 'Button'

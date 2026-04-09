interface AvatarProps {
  name?:     string
  src?:      string
  size?:     'xs' | 'sm' | 'md' | 'lg'
  status?:   'online' | 'offline' | 'busy'
  className?: string
}

const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
const statusColors = { online: 'bg-emerald-500', offline: 'bg-slate-400', busy: 'bg-amber-500' }

function initials(name = '') {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

const gradients = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-indigo-500',
  'from-violet-500 to-pink-500',
  'from-amber-500 to-orange-500',
]

function gradientFor(name = '') {
  const code = name.charCodeAt(0) || 0
  return gradients[code % gradients.length]
}

export function Avatar({ name, src, size = 'md', status, className = '' }: AvatarProps) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={[
          sizes[size],
          'rounded-full flex items-center justify-center font-semibold text-white',
          `bg-gradient-to-br ${gradientFor(name)}`,
        ].join(' ')}>
          {initials(name)}
        </div>
      )}
      {status && (
        <span className={[
          'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-cg-surface',
          statusColors[status],
        ].join(' ')} />
      )}
    </div>
  )
}

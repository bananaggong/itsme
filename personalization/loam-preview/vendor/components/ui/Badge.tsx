import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-600',
  neutral: 'bg-slate-100 text-slate-600',
}

const dotColorClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
      ].join(' ')}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColorClasses[variant],
          ].join(' ')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

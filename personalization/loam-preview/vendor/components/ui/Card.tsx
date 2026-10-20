import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={[
        'border border-slate-200 rounded-lg bg-white',
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={[
        'pb-3 mb-3 border-b border-slate-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={className || undefined}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={[
        'pt-3 mt-3 border-t border-slate-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

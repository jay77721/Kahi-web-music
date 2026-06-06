'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface TagProps {
  label: string
  color?: string
  onClick?: () => void
  active?: boolean
  className?: string
}

export function Tag({ label, color, onClick, active = false, className }: TagProps) {
  const accentStyle = color
    ? ({ '--tag-accent': color } as CSSProperties)
    : undefined

  const content = (
    <span
      className={cn(
        'tag-gradient-border relative inline-flex items-center rounded-full',
        'px-3 py-1 text-xs font-medium select-none',
        'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]',
        'transition-colors duration-200',
        'group-hover:text-[var(--text-primary)]',
        active && 'bg-[var(--tag-accent,var(--accent))]/20 border-[var(--tag-accent,var(--accent))] text-[var(--tag-accent,var(--accent))]',
        !active && 'group-hover:bg-[var(--bg-hover)]',
        className
      )}
      style={accentStyle}
    >
      {label}
    </span>
  )

  if (!onClick) {
    return <span className="group inline-block">{content}</span>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="group inline-block bg-transparent border-0 p-0 cursor-pointer hover-scale active-scale"
    >
      {content}
    </button>
  )
}

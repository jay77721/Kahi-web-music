'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface BatchAction {
  /** Visible label for the action button. */
  label: string
  /** Click handler. The bar leaves selection management to the parent. */
  onClick: () => void
  /** Optional leading icon. */
  icon?: React.ReactNode
  /** Marks the action as destructive — styled with a red accent. */
  danger?: boolean
  /** Disables the button (e.g. when the action is in-flight). */
  disabled?: boolean
}

interface BatchActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: ReadonlyArray<BatchAction>
  className?: string
  /**
   * Disables the CSS slide-up entrance — useful inside tests where animation
   * classes can race against assertions.
   */
  animated?: boolean
}

/**
 * Sticky glass-panel action bar that surfaces while a multi-select session is
 * active. Visibility is driven entirely by `selectedCount` and the bar is
 * rendered only while a selection exists.
 */
export function BatchActionBar({
  selectedCount,
  onClear,
  actions,
  className,
  animated = true,
}: BatchActionBarProps) {
  const isVisible = selectedCount > 0

  if (!isVisible) return null

  return (
    <div
      data-testid="batch-action-bar"
      role="toolbar"
      aria-label={`批量操作工具栏 - 已选 ${selectedCount} 首`}
      className={cn(
        'fixed left-1/2 -translate-x-1/2 bottom-6 z-50',
        'flex items-center gap-2 px-4 py-3 rounded-2xl',
        'backdrop-blur-xl bg-[var(--bg-overlay)]/80 border border-[var(--border)]',
        'shadow-[var(--shadow-lg)]',
        'max-w-[min(720px,calc(100vw-2rem))]',
        'motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
        animated && 'motion-safe:animate-[slideUp_240ms_ease-out_both] motion-reduce:animate-none',
        className
      )}
    >
      <span
        className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap pr-2 border-r border-[var(--border)]"
        data-testid="batch-action-bar-count"
      >
        已选 {selectedCount} 首
      </span>

      <div className="flex items-center gap-1 overflow-x-auto">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="ghost"
            disabled={action.disabled}
            onClick={action.onClick}
            className={cn(
              'h-8 px-3 text-xs font-medium gap-1.5 rounded-full',
              'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-hover)]',
              action.danger &&
                'text-[color:var(--danger,#f87171)] hover:text-[color:var(--danger,#f87171)] hover:bg-red-500/10'
            )}
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={onClear}
        aria-label="取消选择"
        data-testid="batch-action-bar-clear"
        className="ml-1 h-8 w-8 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

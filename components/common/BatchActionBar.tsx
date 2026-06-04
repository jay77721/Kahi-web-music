'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

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
   * Disables the slide-up entrance — useful inside tests where Framer Motion's
   * animation can race against assertions.
   */
  animated?: boolean
}

/**
 * Sticky glass-panel action bar that surfaces while a multi-select session is
 * active. Visibility is driven entirely by `selectedCount` so the parent can
 * keep the bar mounted and let it animate in/out.
 */
export function BatchActionBar({
  selectedCount,
  onClear,
  actions,
  className,
  animated = true,
}: BatchActionBarProps) {
  const isVisible = selectedCount > 0
  const prefersReducedMotion = useReducedMotion()

  // When the user prefers reduced motion we still keep the bar visible,
  // but the slide-up entrance is replaced with a motionless snap-in. The
  // `animated` opt-out continues to win for tests.
  const shouldAnimate = animated && !prefersReducedMotion
  const entrance = shouldAnimate
    ? { initial: { y: 80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 80, opacity: 0 } }
    : { initial: false, animate: undefined, exit: undefined }
  const transition = shouldAnimate
    ? { type: 'spring' as const, stiffness: 320, damping: 28 }
    : { duration: 0 }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="batch-action-bar"
          role="toolbar"
          aria-label={`批量操作工具栏 - 已选 ${selectedCount} 首`}
          initial={entrance.initial}
          animate={entrance.animate}
          exit={entrance.exit}
          transition={transition}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 bottom-6 z-50',
            'flex items-center gap-2 px-4 py-3 rounded-2xl',
            'backdrop-blur-xl bg-[var(--bg-overlay)]/80 border border-[var(--border)]',
            'shadow-[var(--shadow-lg)]',
            'max-w-[min(720px,calc(100vw-2rem))]',
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}

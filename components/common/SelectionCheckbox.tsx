'use client'

import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectionState = 'none' | 'partial' | 'all'

interface SelectionCheckboxProps {
  state: SelectionState
  onChange: () => void
  /** ARIA label is required for a11y because the icon-only checkbox has no visible text. */
  'aria-label': string
  'data-testid'?: string
  className?: string
}

function stateToAriaChecked(
  state: SelectionState
): React.AriaAttributes['aria-checked'] {
  if (state === 'all') return true
  if (state === 'partial') return 'mixed'
  return false
}

/**
 * Tri-state checkbox built on a real `<button role="checkbox">` so that
 * keyboard focus, Enter/Space activation, and screen-reader announcements all
 * work without bringing in a heavier checkbox primitive.
 */
export function SelectionCheckbox({
  state,
  onChange,
  className,
  'aria-label': ariaLabel,
  'data-testid': testId,
}: SelectionCheckboxProps) {
  const ariaChecked = stateToAriaChecked(state)
  const isFilled = state !== 'none'

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={ariaChecked}
      aria-label={ariaLabel}
      data-testid={testId}
      data-state={state}
      onClick={(event) => {
        event.stopPropagation()
        onChange()
      }}
      onDoubleClick={(event) => event.stopPropagation()}
      className={cn(
        'inline-flex items-center justify-center w-4 h-4 rounded',
        'border transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        isFilled
          ? 'bg-[var(--accent)] border-[var(--accent)] text-black'
          : 'bg-transparent border-[var(--border)] hover:border-[var(--accent)]',
        className
      )}
    >
      {state === 'all' && <Check className="w-3 h-3" strokeWidth={3} />}
      {state === 'partial' && <Minus className="w-3 h-3" strokeWidth={3} />}
    </button>
  )
}

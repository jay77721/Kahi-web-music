'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsRowProps {
  /** Primary label. */
  label: string
  /** Optional secondary description below the label. */
  description?: string
  /** Control (switch, select, etc.) rendered on the right side. */
  control: ReactNode
  /** Optional icon shown before the label. */
  icon?: ReactNode
  /** Optional id of the control, used to wire aria-labelledby. */
  controlId?: string
  /** Visually disabled state. */
  disabled?: boolean
  className?: string
}

/**
 * A single labelled row used inside <SettingsSection />.
 * Pairs the label with the control via htmlFor/<label> for a11y.
 */
export function SettingsRow({
  label,
  description,
  control,
  icon,
  controlId,
  disabled = false,
  className,
}: SettingsRowProps) {
  const labelEl = (
    <span className="flex flex-col min-w-0">
      <span className="text-sm font-medium text-white/90 truncate">{label}</span>
      {description && (
        <span className="text-xs text-white/40 mt-0.5">{description}</span>
      )}
    </span>
  )

  return (
    <div
      data-testid="settings-row"
      data-disabled={disabled || undefined}
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3.5',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <span
            aria-hidden="true"
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/60"
          >
            {icon}
          </span>
        )}
        {controlId ? (
          <label htmlFor={controlId} className="min-w-0 flex-1 cursor-pointer">
            {labelEl}
          </label>
        ) : (
          <div className="min-w-0 flex-1">{labelEl}</div>
        )}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  )
}

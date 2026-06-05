'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsRowProps {
  /** Primary label. */
  label: string
  /** Optional secondary description below the label. */
  description?: string
  /** Control (switch, select, etc.) rendered beside or below the label. */
  control: ReactNode
  /** Optional icon shown before the label. */
  icon?: ReactNode
  /** Optional id of the control, used to wire aria-labelledby. */
  controlId?: string
  /** Visually disabled state. */
  disabled?: boolean
  /** Use stacked layout for wide controls such as segmented buttons. */
  controlLayout?: 'inline' | 'stacked'
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
  controlLayout = 'inline',
  className,
}: SettingsRowProps) {
  const labelEl = (
    <span className="flex flex-col min-w-0">
      <span className="text-sm font-medium leading-5 text-[var(--text-primary)]">{label}</span>
      {description && (
        <span className="mt-0.5 text-xs leading-5 text-[var(--text-tertiary)]">{description}</span>
      )}
    </span>
  )

  return (
    <div
      data-testid="settings-row"
      data-disabled={disabled || undefined}
      className={cn(
        'flex flex-col gap-2.5 px-4 py-3',
        controlLayout === 'inline' && 'sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <div className="flex w-full items-start gap-3 min-w-0">
        {icon && (
          <span
            aria-hidden="true"
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-secondary)]"
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
      <div
        className={cn(
          'w-full min-w-0',
          controlLayout === 'inline' && 'sm:w-auto sm:flex-shrink-0',
        )}
      >
        {control}
      </div>
    </div>
  )
}

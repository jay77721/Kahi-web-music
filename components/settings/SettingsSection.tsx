'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  /** Section title shown above the group. */
  title: string
  /** Optional short description shown under the title. */
  description?: string
  /** Optional visual marker for the section. */
  icon?: ReactNode
  /** Optional right-aligned section metadata. */
  meta?: ReactNode
  /** Section body, typically a stack of <SettingsRow />. */
  children: ReactNode
  className?: string
}

/**
 * A labeled group of settings rows. Pure presentational; no state.
 */
export function SettingsSection({
  title,
  description,
  icon,
  meta,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      data-testid="settings-section"
      aria-labelledby={`settings-section-${title}`}
      className={cn(
        'overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 px-4 py-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--accent)]"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2
              id={`settings-section-${title}`}
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs leading-5 text-[var(--text-tertiary)]">{description}</p>
            )}
          </div>
        </div>
        {meta && (
          <div className="shrink-0 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-xs font-medium text-[var(--text-tertiary)]">
            {meta}
          </div>
        )}
      </header>
      <div
        role="group"
        className="divide-y divide-[var(--border-subtle)]"
      >
        {children}
      </div>
    </section>
  )
}

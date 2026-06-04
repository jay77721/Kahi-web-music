'use client'

import type { ReactNode } from 'react'

interface SettingsSectionProps {
  /** Section title shown above the group. */
  title: string
  /** Optional short description shown under the title. */
  description?: string
  /** Section body — typically a stack of <SettingsRow />. */
  children: ReactNode
}

/**
 * A labeled group of settings rows. Pure presentational; no state.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section
      data-testid="settings-section"
      aria-labelledby={`settings-section-${title}`}
      className="space-y-3"
    >
      <header className="px-1">
        <h2
          id={`settings-section-${title}`}
          className="text-[13px] font-bold uppercase tracking-[0.15em] text-white/40"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-white/30">{description}</p>
        )}
      </header>
      <div
        role="group"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04] overflow-hidden"
      >
        {children}
      </div>
    </section>
  )
}

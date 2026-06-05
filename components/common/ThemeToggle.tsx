'use client'

import { useCallback, useRef } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

type ThemeOption = 'system' | 'dark' | 'light'

interface OptionDescriptor {
  value: ThemeOption
  label: string
  Icon: typeof Sun
  ariaLabel: string
}

const OPTIONS: ReadonlyArray<OptionDescriptor> = [
  { value: 'system', label: '跟随系统', Icon: Monitor, ariaLabel: '跟随系统主题' },
  { value: 'dark', label: '深色', Icon: Moon, ariaLabel: '切换到深色主题' },
  { value: 'light', label: '浅色', Icon: Sun, ariaLabel: '切换到浅色主题' },
]

interface ThemeToggleProps {
  className?: string
}

/**
 * Three-way theme picker (system / dark / light). Renders as a segmented
 * control so the current selection is visible at a glance. Each button
 * surfaces its own descriptive aria-label, and the group announces the
 * current selection through `role="radiogroup"` semantics.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useUIStore((state) => state.theme)
  const setTheme = useUIStore((state) => state.setTheme)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleSelect = useCallback(
    (next: ThemeOption) => () => setTheme(next),
    [setTheme]
  )

  const moveSelection = useCallback(
    (nextIndex: number) => {
      const option = OPTIONS[nextIndex]
      setTheme(option.value)
      window.requestAnimationFrame(() => {
        buttonRefs.current[nextIndex]?.focus()
      })
    },
    [setTheme]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = Math.max(
        0,
        OPTIONS.findIndex((option) => option.value === theme)
      )

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        moveSelection((currentIndex + 1) % OPTIONS.length)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        moveSelection((currentIndex - 1 + OPTIONS.length) % OPTIONS.length)
      } else if (event.key === 'Home') {
        event.preventDefault()
        moveSelection(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        moveSelection(OPTIONS.length - 1)
      }
    },
    [moveSelection, theme]
  )

  return (
    <div
      role="radiogroup"
      aria-label="主题切换"
      data-testid="theme-toggle"
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-full',
        'bg-[var(--bg-elevated)] border border-[var(--border)]',
        className
      )}
    >
      {OPTIONS.map((option, index) => {
        const { Icon } = option
        const selected = theme === option.value
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            data-testid={`theme-toggle-${option.value}`}
            tabIndex={selected ? 0 : -1}
            ref={(element) => {
              buttonRefs.current[index] = element
            }}
            onClick={handleSelect(option.value)}
            className={cn(
              'h-8 w-8 rounded-full p-0 transition-colors duration-150',
              selected
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Icon className="w-4 h-4" />
          </Button>
        )
      })}
    </div>
  )
}

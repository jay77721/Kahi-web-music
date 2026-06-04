'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Identifier type used by the multi-select hook. Strings cover the widest
 * variety of upstream sources (UUIDs, slugs, numeric ids cast to string).
 */
export type SelectableId = string

export interface UseMultiSelectOptions {
  /**
   * Whether keyboard shortcuts (Ctrl/Cmd+A select all, Esc clear) are wired up.
   * Defaults to `true`. Pass `false` for tests or when keyboard handling
   * conflicts with an enclosing widget.
   */
  enableKeyboard?: boolean
  /**
   * Pool of ids available to "select all". Required when `enableKeyboard` is
   * `true` so Ctrl+A can populate the set without a separate call site.
   */
  allIds?: ReadonlyArray<SelectableId>
}

export interface UseMultiSelectResult {
  /** Frozen snapshot of currently-selected ids. Always a new Set per change. */
  selectedIds: ReadonlySet<SelectableId>
  /** Number of currently-selected ids. Memoised. */
  count: number
  /** Toggle a single id on/off. */
  toggle: (id: SelectableId) => void
  /** Replace the selection with every id in `ids` (deduped). */
  selectAll: (ids: ReadonlyArray<SelectableId>) => void
  /** Drop every selection. */
  clear: () => void
  /** Cheap O(1) membership test. */
  isSelected: (id: SelectableId) => boolean
}

/**
 * Lightweight controller for multi-selection UIs (lists, tables, grids).
 *
 * - Selection state lives in an immutable `Set<string>` snapshot — every
 *   mutation returns a new Set so consumers can rely on identity-equality.
 * - Optional keyboard support binds Ctrl/Cmd+A to select all and Escape to
 *   clear. The handler ignores key events that originate from form controls
 *   so it does not hijack typing inside inputs/textareas.
 */
export function useMultiSelect(
  options: UseMultiSelectOptions = {}
): UseMultiSelectResult {
  const { enableKeyboard = true, allIds } = options
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<SelectableId>>(
    () => new Set<SelectableId>()
  )

  const toggle = useCallback((id: SelectableId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: ReadonlyArray<SelectableId>) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => {
    setSelectedIds(new Set<SelectableId>())
  }, [])

  const isSelected = useCallback(
    (id: SelectableId) => selectedIds.has(id),
    [selectedIds]
  )

  useEffect(() => {
    if (!enableKeyboard) return
    if (typeof window === 'undefined') return

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isFormControl =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true

      if (isFormControl) return

      // Also defer to composite ARIA widgets and rich-text surfaces. Ctrl+A
      // is a meaningful affordance inside listboxes, checkable grids, and
      // contenteditable hosts — hijacking it would break expected behaviour
      // for screen-reader users (#M4).
      if (target?.closest?.('[role="checkbox"], [role="listbox"], [contenteditable], [contenteditable="true"], [contenteditable=""]')) {
        return
      }

      const isSelectAll =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a'

      if (isSelectAll && allIds && allIds.length > 0) {
        event.preventDefault()
        selectAll(allIds)
        return
      }

      if (event.key === 'Escape') {
        clear()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enableKeyboard, allIds, selectAll, clear])

  return useMemo(
    () => ({
      selectedIds,
      count: selectedIds.size,
      toggle,
      selectAll,
      clear,
      isSelected,
    }),
    [selectedIds, toggle, selectAll, clear, isSelected]
  )
}

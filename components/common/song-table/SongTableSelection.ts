import type { SelectionState } from '../SelectionCheckbox'

export type HeaderCheckboxState = SelectionState

export const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>()

export function deriveHeaderState(
  total: number,
  selectedCount: number
): HeaderCheckboxState {
  if (selectedCount === 0) return 'none'
  if (selectedCount >= total) return 'all'
  return 'partial'
}

export function countSelectedVisibleIds(
  visibleIds: ReadonlyArray<string>,
  selectedIds: ReadonlySet<string>
): number {
  return visibleIds.reduce(
    (count, id) => count + (selectedIds.has(id) ? 1 : 0),
    0
  )
}

export function getSongTableGridClass(selectable: boolean): string {
  return selectable
    ? 'grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_minmax(80px,1fr)_minmax(60px,1fr)_auto] gap-3'
    : 'grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_minmax(80px,1fr)_minmax(60px,1fr)_auto] gap-3'
}

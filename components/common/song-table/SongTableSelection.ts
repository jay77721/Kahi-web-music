export type HeaderCheckboxState = 'none' | 'partial' | 'all'

export const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>()

export function deriveHeaderState(
  total: number,
  selectedCount: number
): HeaderCheckboxState {
  if (selectedCount === 0) return 'none'
  if (selectedCount >= total) return 'all'
  return 'partial'
}

export function getSongTableGridClass(selectable: boolean): string {
  return selectable
    ? 'grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_minmax(80px,1fr)_minmax(60px,1fr)_auto] gap-3'
    : 'grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_minmax(80px,1fr)_minmax(60px,1fr)_auto] gap-3'
}

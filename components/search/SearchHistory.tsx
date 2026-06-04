'use client'

import { X, Clock } from 'lucide-react'
import { storage, STORAGE_KEYS } from '@/lib/storage'

interface SearchHistoryProps {
  onSelect: (keyword: string) => void
  onClear?: () => void
  maxItems?: number
}

export function SearchHistory({ onSelect, onClear, maxItems = 8 }: SearchHistoryProps) {
  const history: string[] = storage.get<string[]>(STORAGE_KEYS.SEARCH_HISTORY, [])

  if (history.length === 0) return null

  const displayHistory = history.slice(0, maxItems)

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    storage.remove(STORAGE_KEYS.SEARCH_HISTORY)
    onClear?.()
  }

  const handleRemove = (e: React.MouseEvent, item: string) => {
    e.stopPropagation()
    const updated = history.filter((h) => h !== item)
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, updated.length > 0 ? updated : null)
    // Re-trigger by selecting nothing and letting parent re-render
    onClear?.()
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          搜索历史
        </h3>
        <button
          onClick={handleClear}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          清除全部
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayHistory.map((item) => (
          <div
            key={item}
            className="group flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 cursor-pointer"
            onClick={() => onSelect(item)}
          >
            <span className="truncate max-w-[180px]">{item}</span>
            <button
              onClick={(e) => handleRemove(e, item)}
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

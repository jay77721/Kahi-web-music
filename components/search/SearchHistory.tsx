'use client'

import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import { storage, STORAGE_KEYS } from '@/lib/storage'

interface SearchHistoryProps {
  onSelect: (keyword: string) => void
  onClear?: () => void
  maxItems?: number
}

function readSearchHistory(): string[] {
  const storedHistory = storage.get<unknown>(STORAGE_KEYS.SEARCH_HISTORY, [])
  return Array.isArray(storedHistory)
    ? storedHistory.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
}

export function SearchHistory({ onSelect, onClear, maxItems = 8 }: SearchHistoryProps) {
  const [history, setHistory] = useState(readSearchHistory)

  if (history.length === 0) return null

  const displayHistory = history.slice(0, maxItems)

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    storage.remove(STORAGE_KEYS.SEARCH_HISTORY)
    setHistory([])
    onClear?.()
  }

  const handleRemove = (e: React.MouseEvent, item: string) => {
    e.stopPropagation()
    const updated = history.filter((h) => h !== item)
    if (updated.length > 0) {
      storage.set(STORAGE_KEYS.SEARCH_HISTORY, updated)
    } else {
      storage.remove(STORAGE_KEYS.SEARCH_HISTORY)
    }
    setHistory(updated)
    onClear?.()
  }

  return (
    <section className="mb-6" aria-labelledby="search-history-heading">
      <div className="flex items-center justify-between mb-3">
        <h3
          id="search-history-heading"
          className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5"
        >
          <Clock className="w-4 h-4" />
          搜索历史
        </h3>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md px-1.5 py-1 text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70"
          aria-label="清除全部搜索历史"
        >
          清除全部
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="list">
        {displayHistory.map((item) => (
          <div
            key={item}
            className="group inline-flex max-w-full overflow-hidden rounded-full bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            role="listitem"
          >
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="min-w-0 px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/70"
              aria-label={`搜索 ${item}`}
            >
              <span className="block max-w-[180px] truncate">{item}</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleRemove(e, item)}
              className="flex w-7 items-center justify-center pr-2 opacity-0 transition-opacity hover:text-[var(--text-primary)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/70 group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`删除搜索历史：${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

'use client'

import { useState, useCallback, useRef, useEffect, useMemo, type RefObject } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import type {
  SearchSuggestionSection,
  SearchSuggestResponse,
  SuggestSong,
  SuggestArtist,
  SuggestAlbum,
  SuggestPlaylist,
} from '@/types/search'
import { cn } from '@/lib/utils'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface SearchSuggestionsProps {
  query: string
  onSelect: (keyword: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
  enabled?: boolean
}

type Section = 'songs' | 'artists' | 'albums' | 'playlists'

interface SuggestionItem {
  id: number
  name: string
  sub?: string
}

interface SuggestionSection {
  section: SearchSuggestionSection
  items: SuggestionItem[]
}

const LISTBOX_ID = 'search-suggestions-listbox'

const SUGGESTION_SWR_OPTIONS = {
  revalidateOnFocus: false,
  keepPreviousData: false,
} as const

function clearComboboxAttributes(input: HTMLInputElement) {
  input.removeAttribute('aria-activedescendant')
  input.removeAttribute('aria-controls')
  input.removeAttribute('aria-expanded')
  input.removeAttribute('aria-autocomplete')
}

export function SearchSuggestions({ query, onSelect, inputRef, enabled = true }: SearchSuggestionsProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebouncedValue(query, 300)
  const trimmedQuery = query.trim()
  const debouncedTrimmedQuery = debouncedQuery.trim()
  const isDebouncing = trimmedQuery.length > 0 && debouncedTrimmedQuery !== trimmedQuery
  const shouldFetchSuggestions = enabled && debouncedTrimmedQuery.length > 0

  const { data, isLoading } = useSWR<SearchSuggestResponse>(
    shouldFetchSuggestions ? `/search/suggest:${debouncedTrimmedQuery}` : null,
    async () => {
      return (await ncmApi.searchSuggest(debouncedTrimmedQuery)) as SearchSuggestResponse
    },
    SUGGESTION_SWR_OPTIONS
  )

  const sections = useMemo<SuggestionSection[]>(() => {
    const nextSections: SuggestionSection[] = []
    const result = data?.result
    if (!result) return nextSections

    if (result.songs?.length) {
      nextSections.push({
        section: 'songs',
        items: result.songs.map((s: SuggestSong) => ({
          id: s.id,
          name: s.name,
          sub: s.artists?.map((a) => a.name).filter(Boolean).join(' / '),
        })),
      })
    }
    if (result.artists?.length) {
      nextSections.push({
        section: 'artists',
        items: result.artists.map((a: SuggestArtist) => ({ id: a.id, name: a.name })),
      })
    }
    if (result.albums?.length) {
      nextSections.push({
        section: 'albums',
        items: result.albums.map((a: SuggestAlbum) => ({
          id: a.id,
          name: a.name,
          sub: a.artist?.name,
        })),
      })
    }
    if (result.playlists?.length) {
      nextSections.push({
        section: 'playlists',
        items: result.playlists.map((p: SuggestPlaylist) => ({
          id: p.id,
          name: p.name,
          sub: p.creator?.nickname,
        })),
      })
    }

    return nextSections
  }, [data])

  const showLoading = enabled && (isDebouncing || isLoading)
  const visibleSections = useMemo(() => (showLoading ? [] : sections), [sections, showLoading])
  const flatItems = useMemo(() => visibleSections.flatMap((section) => section.items), [visibleSections])
  const totalItems = flatItems.length
  const isOpen = enabled && trimmedQuery.length > 0 && dismissedQuery !== trimmedQuery && (showLoading || totalItems > 0)
  const boundedActiveIndex = activeIndex >= 0 && activeIndex < totalItems ? activeIndex : -1
  const activeOptionId =
    boundedActiveIndex >= 0 ? `suggestion-${boundedActiveIndex}` : undefined

  const sectionLabel: Record<Section, string> = {
    songs: '歌曲',
    artists: '歌手',
    albums: '专辑',
    playlists: '歌单',
  }

  const handleSelect = useCallback(
    (name: string) => {
      onSelect(name)
      setActiveIndex(-1)
      setDismissedQuery(null)
    },
    [onSelect]
  )

  useEffect(() => {
    const input = inputRef?.current
    if (!input) return
    if (!enabled) {
      clearComboboxAttributes(input)
      return
    }

    input.setAttribute('aria-autocomplete', 'list')
    input.setAttribute('aria-expanded', String(isOpen))
    if (isOpen) {
      input.setAttribute('aria-controls', LISTBOX_ID)
    } else {
      input.removeAttribute('aria-controls')
    }
    if (activeOptionId) {
      input.setAttribute('aria-activedescendant', activeOptionId)
    } else {
      input.removeAttribute('aria-activedescendant')
    }

    return () => {
      clearComboboxAttributes(input)
    }
  }, [activeOptionId, enabled, inputRef, isOpen])

  useEffect(() => {
    const input = inputRef?.current
    if (!input || !enabled) return

    function handleInput() {
      setActiveIndex(-1)
      setDismissedQuery(null)
    }

    input.addEventListener('input', handleInput)
    return () => input.removeEventListener('input', handleInput)
  }, [enabled, inputRef])

  useEffect(() => {
    const input = inputRef?.current
    if (!input || !isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        if (totalItems === 0) return
        event.preventDefault()
        setActiveIndex((index) => {
          const currentIndex = index >= 0 && index < totalItems ? index : -1
          return (currentIndex + 1) % totalItems
        })
        return
      }

      if (event.key === 'ArrowUp') {
        if (totalItems === 0) return
        event.preventDefault()
        setActiveIndex((index) => {
          const currentIndex = index >= 0 && index < totalItems ? index : -1
          return currentIndex <= 0 ? totalItems - 1 : currentIndex - 1
        })
        return
      }

      if (event.key === 'Enter' && boundedActiveIndex >= 0) {
        event.preventDefault()
        handleSelect(flatItems[boundedActiveIndex].name)
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setActiveIndex(-1)
        setDismissedQuery(trimmedQuery)
      }
    }

    input.addEventListener('keydown', handleKeyDown)
    return () => input.removeEventListener('keydown', handleKeyDown)
  }, [boundedActiveIndex, flatItems, handleSelect, inputRef, isOpen, totalItems, trimmedQuery])

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target) || inputRef?.current?.contains(target)) return

      setActiveIndex(-1)
      setDismissedQuery(trimmedQuery)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputRef, isOpen, trimmedQuery])

  const highlightText = useCallback(
    (text: string, query: string): React.ReactNode => {
      if (!query.trim()) return text
      const escaped = escapeRegex(query.trim())
      const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
      return parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={index} className="bg-[var(--accent)]/25 text-[var(--text-primary)] rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )
    },
    []
  )

  let flatCounter = 0

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-surface)] shadow-2xl shadow-black/40 backdrop-blur-xl"
      role="listbox"
      id={LISTBOX_ID}
      aria-label="搜索建议"
      aria-busy={showLoading}
    >
      {showLoading ? (
        <div className="p-4">
          <div
            role="status"
            aria-live="polite"
            aria-label="正在加载搜索建议"
            className="sr-only"
          >
            正在加载搜索建议
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-4 w-4 rounded-full bg-white/5" />
              <div className="h-4 flex-1 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto p-2">
          {visibleSections.map((section) => (
            <div key={section.section} className="mb-2 last:mb-0">
              <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                {sectionLabel[section.section]}
              </div>
              {section.items.map((item) => {
                const currentIndex = flatCounter++
                const isActive = currentIndex === boundedActiveIndex
                return (
                  <button
                    key={`${section.section}-${item.id}-${currentIndex}`}
                    id={`suggestion-${currentIndex}`}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                      isActive ? 'bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/5'
                    )}
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(item.name)}
                    tabIndex={-1}
                    type="button"
                  >
                    <span className="flex-1 truncate text-sm">
                      {highlightText(item.name, trimmedQuery)}
                    </span>
                    {item.sub && (
                      <span className="truncate text-xs text-[var(--text-tertiary)]">{item.sub}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

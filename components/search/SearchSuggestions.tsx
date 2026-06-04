'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import type { SearchSuggestResponse, SuggestSong, SuggestArtist, SuggestAlbum, SuggestPlaylist } from '@/types/search'
import { cn } from '@/lib/utils'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface SearchSuggestionsProps {
  query: string
  onSelect: (keyword: string) => void
}

type Section = 'songs' | 'artists' | 'albums' | 'playlists'

interface SuggestionSection {
  section: Section
  items: Array<{ id: number; name: string; sub?: string }>
}

export function SearchSuggestions({ query, onSelect }: SearchSuggestionsProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebouncedValue(query, 300)

  const { data, isLoading } = useSWR<SearchSuggestResponse>(
    debouncedQuery.trim() ? `/search/suggest:${debouncedQuery.trim()}` : null,
    async () => {
      return (await ncmApi.searchSuggest(debouncedQuery.trim())) as SearchSuggestResponse
    },
    { keepPreviousData: true }
  )

  const sections: SuggestionSection[] = []
  const result = data?.result
  if (result) {
    if (result.songs?.length) {
      sections.push({
        section: 'songs',
        items: result.songs.map((s: SuggestSong) => ({
          id: s.id,
          name: s.name,
          sub: s.artists.map((a: { id: number; name: string }) => a.name).join(' / '),
        })),
      })
    }
    if (result.artists?.length) {
      sections.push({
        section: 'artists',
        items: result.artists.map((a: SuggestArtist) => ({ id: a.id, name: a.name })),
      })
    }
    if (result.albums?.length) {
      sections.push({
        section: 'albums',
        items: result.albums.map((a: SuggestAlbum) => ({
          id: a.id,
          name: a.name,
          sub: a.artist?.name,
        })),
      })
    }
    if (result.playlists?.length) {
      sections.push({
        section: 'playlists',
        items: result.playlists.map((p: SuggestPlaylist) => ({
          id: p.id,
          name: p.name,
          sub: p.creator?.nickname,
        })),
      })
    }
  }

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
  const isOpen = query.trim().length > 0 && !isLoading && totalItems > 0

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
    },
    [onSelect]
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      id="search-suggestions-listbox"
      aria-label="搜索建议"
    >
      {isLoading ? (
        <div className="p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-4 w-4 rounded-full bg-white/5" />
              <div className="h-4 flex-1 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.section} className="mb-2 last:mb-0">
              <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)]">
                {sectionLabel[section.section]}
              </div>
              {section.items.map((item) => {
                const currentIndex = flatCounter++
                const isActive = currentIndex === activeIndex
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
                    onClick={() => handleSelect(item.name)}
                    type="button"
                  >
                    <span className="flex-1 truncate text-sm">
                      {highlightText(item.name, query)}
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

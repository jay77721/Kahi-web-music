'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Search, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SearchHistory } from '@/components/search/SearchHistory'
import { HotSearchTags } from '@/components/search/HotSearchTags'
import { SearchSuggestions } from '@/components/search/SearchSuggestions'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { cn } from '@/lib/utils'

const MAX_HISTORY = 8

type SearchType = 'songs' | 'lyric'

const LazySearchResults = dynamic<{ keywords: string }>(
  () => import('@/components/search/SearchResults').then((module) => module.SearchResults),
  { loading: () => <SearchResultsFallback /> }
)

const LazyLyricSearchResults = dynamic<{ query: string }>(
  () => import('@/components/search/LyricSearchResults').then((module) => module.LyricSearchResults),
  { loading: () => <SearchResultsFallback /> }
)

function SearchPageContent({ query, type }: { query: string; type: SearchType }) {
  const router = useRouter()
  const [inputValue, setInputValue] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldRefocusInputRef = useRef(false)

  const saveToHistory = useCallback((keyword: string) => {
    if (!keyword.trim()) return
    const existing: string[] = storage.get<string[]>(STORAGE_KEYS.SEARCH_HISTORY, [])
    const trimmed = keyword.trim()
    const updated = [trimmed, ...existing.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY)
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, updated)
  }, [])

  const handleSearch = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim()
      if (!trimmed) return
      saveToHistory(trimmed)
      setInputValue(trimmed)
      const params = new URLSearchParams()
      params.set('q', trimmed)
      if (type === 'lyric') params.set('type', 'lyric')
      router.push(`/search?${params.toString()}`)
      setIsFocused(false)
      inputRef.current?.blur()
    },
    [router, saveToHistory, type]
  )

  const handleTypeChange = useCallback(
    (next: SearchType) => {
      if (!query) {
        const params = new URLSearchParams()
        if (next === 'lyric') params.set('type', 'lyric')
        router.replace(`/search${params.toString() ? `?${params.toString()}` : ''}`)
        return
      }
      const params = new URLSearchParams()
      params.set('q', query)
      if (next === 'lyric') params.set('type', 'lyric')
      router.push(`/search?${params.toString()}`)
    },
    [router, query]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(inputValue)
  }

  const handleClear = useCallback(() => {
    shouldRefocusInputRef.current = true
    setInputValue('')
    const params = new URLSearchParams()
    if (type === 'lyric') params.set('type', 'lyric')
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`)
  }, [router, type])

  useEffect(() => {
    if (!shouldRefocusInputRef.current) return
    shouldRefocusInputRef.current = false
    inputRef.current?.focus()
  }, [inputValue])

  const handleSelectHistory = useCallback(
    (keyword: string) => {
      handleSearch(keyword)
    },
    [handleSearch]
  )

  const handleClearHistory = useCallback(() => {
    storage.remove(STORAGE_KEYS.SEARCH_HISTORY)
  }, [])

  const hasTypedQuery = inputValue.trim().length > 0
  const showEmptyState = hasTypedQuery && !query
  const showResults = query.length > 0

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-200px)] flex flex-col">
        {/* Centered search hero */}
        <div className="flex flex-col items-center justify-center pt-16 pb-8 px-4">
          {/* Logo / Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center motion-safe:animate-[slideDown_420ms_ease-out_both] motion-reduce:animate-none">
            <span className="text-[var(--accent-text)]">Kahi</span> Music
          </h1>

          {/* Search box */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl motion-safe:animate-[scaleIn_360ms_ease-out_both] motion-reduce:animate-none"
            role="search"
            aria-label="搜索音乐"
          >
            <div className="relative">
              <SearchSuggestions
                query={inputValue}
                onSelect={handleSearch}
                inputRef={inputRef}
                enabled={isFocused}
              />
              <div
                className={cn(
                  'relative flex items-center rounded-full bg-[var(--bg-surface)] border border-white/10',
                  'shadow-lg shadow-black/20 backdrop-blur-xl transition-[padding,border-color,box-shadow] duration-200',
                  isFocused
                    ? 'border-[var(--accent)]/50 shadow-[0_0_30px_var(--accent-glow)] py-1 pr-1 pl-5'
                    : 'py-1.5 pr-1.5 pl-4'
                )}
              >
                <Search className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  aria-label={type === 'lyric' ? '搜索歌词' : '搜索音乐'}
                  autoComplete="off"
                  placeholder={type === 'lyric' ? '输入歌词片段搜索…' : '搜索歌曲、歌手、专辑...'}
                  className="flex-1 bg-transparent px-3 py-2.5 text-base md:text-lg outline-none placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors motion-safe:animate-[scaleIn_150ms_ease-out_both] motion-reduce:animate-none"
                    aria-label="清空搜索关键词"
                  >
                    <X className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="submit"
                  className={cn(
                    'flex items-center justify-center rounded-full font-medium text-sm transition-all duration-200',
                    'bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] active:scale-[0.97]',
                    isFocused ? 'px-5 py-2' : 'px-4 py-2'
                  )}
                >
                  搜索
                </button>
              </div>
            </div>
          </form>

          {/* Quick suggestions when not searching */}
          {!query && (
            <div className="w-full max-w-2xl mt-6 motion-safe:animate-[slideUp_300ms_ease-out_both] motion-reduce:animate-none">
              <SearchHistory
                onSelect={handleSelectHistory}
                onClear={handleClearHistory}
                maxItems={MAX_HISTORY}
              />
              <HotSearchTags onSelect={handleSelectHistory} />
            </div>
          )}
        </div>

        {/* Search results */}
        {showResults && (
          <div
            key={`${query}:${type}`}
            className="flex-1 px-4 md:px-6 pb-32 motion-safe:animate-[slideUp_360ms_ease-out_both] motion-reduce:animate-none"
          >
            {/* Search type tabs */}
            <div className="flex items-center gap-2 mb-6" role="group" aria-label="搜索类型">
              <SearchTypePill
                label="歌曲"
                active={type === 'songs'}
                onClick={() => handleTypeChange('songs')}
              />
              <SearchTypePill
                label="歌词"
                active={type === 'lyric'}
                onClick={() => handleTypeChange('lyric')}
              />
            </div>

            {type === 'lyric' ? (
              <LazyLyricSearchResults query={query} />
            ) : (
              <LazySearchResults keywords={query} />
            )}
          </div>
        )}

        {/* Empty state when query exists but no results loaded yet */}
        {showEmptyState && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32 motion-safe:animate-[fadeIn_240ms_ease-out_both] motion-reduce:animate-none">
            <Search className="w-16 h-16 text-[var(--text-tertiary)] mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-[var(--text-secondary)] mb-2">
              输入关键词开始搜索
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">
              搜索你喜欢的歌曲、歌手、专辑或歌单
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function SearchResultsFallback() {
  return (
    <div
      className="min-h-[240px] space-y-3"
      role="status"
      aria-label="正在加载搜索结果"
      data-testid="search-results-fallback"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl bg-[var(--bg-surface)]/50 px-3 py-3"
          aria-hidden="true"
        >
          <div className="h-10 w-10 rounded bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-white/5" />
            <div className="h-3 w-1/3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6" role="status">加载中...</div></AppShell>}>
      <SearchPageWrapper />
    </Suspense>
  )
}

function SearchPageWrapper() {
  const searchParams = useSearchParams()
  const query = (searchParams.get('q') || '').trim()
  const typeParam = searchParams.get('type')
  const type: SearchType = typeParam === 'lyric' ? 'lyric' : 'songs'

  return <SearchPageContent key={`${query}:${type}`} query={query} type={type} />
}

interface SearchTypePillProps {
  label: string
  active: boolean
  onClick: () => void
}

function SearchTypePill({ label, active, onClick }: SearchTypePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-[0.96]',
        active
          ? 'bg-[var(--accent)] text-black'
          : 'bg-[var(--bg-surface)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-white/5'
      )}
    >
      {label}
    </button>
  )
}

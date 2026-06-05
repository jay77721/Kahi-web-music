'use client'

import { useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SearchResults } from '@/components/search/SearchResults'
import { LyricSearchResults } from '@/components/search/LyricSearchResults'
import { SearchHistory } from '@/components/search/SearchHistory'
import { HotSearchTags } from '@/components/search/HotSearchTags'
import { SearchSuggestions } from '@/components/search/SearchSuggestions'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { cn } from '@/lib/utils'

const MAX_HISTORY = 8

type SearchType = 'songs' | 'lyric'

function SearchPageContent({ query, type }: { query: string; type: SearchType }) {
  const router = useRouter()
  const [inputValue, setInputValue] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setInputValue('')
    const params = new URLSearchParams()
    if (type === 'lyric') params.set('type', 'lyric')
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`)
    inputRef.current?.focus()
  }, [router, type])

  const handleSelectHistory = useCallback(
    (keyword: string) => {
      handleSearch(keyword)
    },
    [handleSearch]
  )

  const handleClearHistory = useCallback(() => {
    storage.remove(STORAGE_KEYS.SEARCH_HISTORY)
  }, [])

  const showEmptyState = inputValue && !query
  const showResults = query

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-200px)] flex flex-col">
        {/* Centered search hero */}
        <div className="flex flex-col items-center justify-center pt-16 pb-8 px-4">
          {/* Logo / Title */}
          <motion.h1
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[var(--accent)]">Kahi</span> Music
          </motion.h1>

          {/* Search box */}
          <motion.form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="relative">
              <SearchSuggestions query={inputValue} onSelect={handleSearch} inputRef={inputRef} />
              <motion.div
                className={cn(
                  'relative flex items-center rounded-full bg-[var(--bg-surface)] border border-white/10',
                  'shadow-lg shadow-black/20 backdrop-blur-xl',
                  isFocused && 'border-[var(--accent)]/50 shadow-[0_0_30px_var(--accent-glow)]'
                )}
                animate={{
                  padding: isFocused ? '4px 4px 4px 20px' : '6px 6px 6px 16px',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
                placeholder={type === 'lyric' ? '输入歌词片段搜索…' : '搜索歌曲、歌手、专辑...'}
                className="flex-1 bg-transparent px-3 py-2.5 text-base md:text-lg outline-none placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
              />
              <AnimatePresence>
                {inputValue && (
                  <motion.button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="清空搜索关键词"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                  </motion.button>
                )}
              </AnimatePresence>
              <motion.button
                type="submit"
                className={cn(
                  'flex items-center justify-center rounded-full font-medium text-sm transition-all duration-200',
                  'bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]',
                  isFocused ? 'px-5 py-2' : 'px-4 py-2'
                )}
                whileTap={{ scale: 0.97 }}
              >
                搜索
              </motion.button>
            </motion.div>
          </div>
          </motion.form>

          {/* Quick suggestions when not searching */}
          <AnimatePresence mode="wait">
            {!query && (
              <motion.div
                className="w-full max-w-2xl mt-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <SearchHistory
                  onSelect={handleSelectHistory}
                  onClear={handleClearHistory}
                  maxItems={MAX_HISTORY}
                />
                <HotSearchTags onSelect={handleSelectHistory} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search results */}
        <AnimatePresence mode="wait">
          {showResults && (
            <motion.div
              key={`${query}:${type}`}
              className="flex-1 px-4 md:px-6 pb-32"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                <LyricSearchResults query={query} />
              ) : (
                <SearchResults keywords={query} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when query exists but no results loaded yet */}
        {showEmptyState && (
          <motion.div
            className="flex-1 flex flex-col items-center justify-center px-4 pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Search className="w-16 h-16 text-[var(--text-tertiary)] mb-4" />
            <p className="text-lg font-medium text-[var(--text-secondary)] mb-2">
              输入关键词开始搜索
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">
              搜索你喜欢的歌曲、歌手、专辑或歌单
            </p>
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6">加载中...</div></AppShell>}>
      <SearchPageWrapper />
    </Suspense>
  )
}

function SearchPageWrapper() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
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
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--accent)] text-black'
          : 'bg-[var(--bg-surface)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-white/5'
      )}
    >
      {label}
    </motion.button>
  )
}

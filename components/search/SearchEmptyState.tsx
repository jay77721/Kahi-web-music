'use client'

import { Search } from 'lucide-react'

export type SearchEmptyStateType = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'mvs' | 'lyrics'

interface SearchEmptyStateProps {
  query: string
  type?: SearchEmptyStateType
}

export function SearchEmptyState({ query, type = 'all' }: SearchEmptyStateProps) {
  const typeLabels: Record<SearchEmptyStateType, string> = {
    all: '内容',
    songs: '歌曲',
    artists: '歌手',
    albums: '专辑',
    playlists: '歌单',
    mvs: 'MV',
    lyrics: '歌词',
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-4 animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div
        className="w-20 h-20 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-6 animate-scale-in"
        style={{ animationDelay: '100ms' }}
      >
        <Search className="w-8 h-8 text-[var(--text-tertiary)]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
        未找到相关{typeLabels[type]}
      </h3>
      <p className="text-sm text-[var(--text-tertiary)] text-center max-w-md">
        没有找到与 &ldquo;<span className="text-[var(--text-primary)]">{query}</span>&rdquo; 相关的{typeLabels[type]}
        <br />
        请尝试其他关键词或检查拼写
      </p>
    </div>
  )
}

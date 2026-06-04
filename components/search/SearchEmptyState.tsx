'use client'

import { Search } from 'lucide-react'
import { motion } from 'framer-motion'

interface SearchEmptyStateProps {
  query: string
  type?: 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'mvs'
}

export function SearchEmptyState({ query, type = 'all' }: SearchEmptyStateProps) {
  const typeLabels: Record<string, string> = {
    all: '内容',
    songs: '歌曲',
    artists: '歌手',
    albums: '专辑',
    playlists: '歌单',
    mvs: 'MV',
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-20 h-20 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-6"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <Search className="w-8 h-8 text-[var(--text-tertiary)]" />
      </motion.div>
      <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
        未找到相关{typeLabels[type]}
      </h3>
      <p className="text-sm text-[var(--text-tertiary)] text-center max-w-md">
        没有找到与 &ldquo;<span className="text-[var(--text-primary)]">{query}</span>&rdquo; 相关的{typeLabels[type]}
        <br />
        请尝试其他关键词或检查拼写
      </p>
    </motion.div>
  )
}

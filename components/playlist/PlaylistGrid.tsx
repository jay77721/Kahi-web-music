'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { PlaylistCard } from '@/components/common/PlaylistCard'
import type { Playlist } from '@/types/api'

export interface PlaylistGridProps {
  playlists: Playlist[]
  className?: string
  ariaLabel?: string
}

const STAGGER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const STAGGER_DELAY_S = 0.05

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_DELAY_S,
      delayChildren: 0,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: STAGGER_EASE },
  },
}

function PlaylistGridImpl({
  playlists,
  className,
  ariaLabel = '歌单列表',
}: PlaylistGridProps) {
  if (playlists.length === 0) return null

  return (
    <motion.ul
      role="list"
      aria-label={ariaLabel}
      className={
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ' +
        (className ?? '')
      }
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {playlists.map((pl) => (
        <motion.li
          key={pl.id}
          variants={itemVariants}
          className="list-none"
          data-playlist-id={pl.id}
        >
          <PlaylistCard
            id={pl.id}
            name={pl.name}
            coverUrl={pl.coverImgUrl}
            playCount={pl.playCount}
          />
        </motion.li>
      ))}
    </motion.ul>
  )
}

export const PlaylistGrid = memo(PlaylistGridImpl)
export default PlaylistGrid

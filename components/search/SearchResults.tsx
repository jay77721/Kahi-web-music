'use client'

import { useState } from 'react'
import { Music, ListMusic, User, Disc, Video } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { ncmApi } from '@/lib/api'
import { SongTable } from '@/components/common/SongTable'
import { PlaylistCard } from '@/components/common/PlaylistCard'
import { imageUrl } from '@/lib/format'
import { SearchEmptyState } from '@/components/search/SearchEmptyState'
import { motion } from 'framer-motion'
import type { Song, Playlist, Artist, Album, MV, SearchResponse } from '@/types/api'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface SearchResultsProps {
  keywords: string
}

type TabValue = 'songs' | 'artists' | 'albums' | 'playlists' | 'mvs'

const SEARCH_TABS: { value: TabValue; label: string; type: number; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'songs', label: '歌曲', type: 1, icon: Music },
  { value: 'artists', label: '歌手', type: 100, icon: User },
  { value: 'albums', label: '专辑', type: 10, icon: Disc },
  { value: 'playlists', label: '歌单', type: 1000, icon: ListMusic },
  { value: 'mvs', label: 'MV', type: 1004, icon: Video },
]

export function SearchResults({ keywords }: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState('songs')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList variant="line" className="mb-6">
        {SEARCH_TABS.map((tab: { value: TabValue; label: string; type: number; icon: React.ComponentType<{ className?: string }> }) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="gap-1.5 data-active:text-[var(--accent)]"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {SEARCH_TABS.map((tab: { value: TabValue; type: number }) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-0">
          <SearchTabContent keywords={keywords} type={tab.type} tabValue={tab.value} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function SearchTabContent({ keywords, type, tabValue }: { keywords: string; type: number; tabValue: 'songs' | 'artists' | 'albums' | 'playlists' | 'mvs' }) {
  const { data, isLoading } = useSWR<SearchResponse>(
    keywords ? `search:${keywords}:${type}` : null,
    async () => {
      return await ncmApi.search(keywords, type, 30)
    }
  )

  if (isLoading) {
    return <SearchSkeleton tabValue={tabValue} />
  }

  if (!data) {
    return <SearchEmptyState query={keywords} type={tabValue} />
  }

  const countKeyMap: Record<string, keyof SearchResponse['result']> = {
    songs: 'songCount',
    artists: 'artistCount',
    albums: 'albumCount',
    playlists: 'playlistCount',
    mvs: 'mvCount',
  }
  const count = data.result?.[countKeyMap[tabValue]] || 0

  if (count === 0) {
    return <SearchEmptyState query={keywords} type={tabValue as 'songs' | 'artists' | 'albums' | 'playlists' | 'mvs'} />
  }

  // Songs
  if (tabValue === 'songs') {
    const songs: Song[] = data.result?.songs || []
    return <SongTable songs={songs} showIndex showAlbum />
  }

  // Playlists
  if (tabValue === 'playlists') {
    const playlists: Playlist[] = data.result?.playlists || []
    return (
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {playlists.map((pl, index) => (
          <motion.div key={pl.id} variants={staggerItem} custom={index}>
            <PlaylistCard
              id={pl.id}
              name={pl.name}
              coverUrl={pl.coverImgUrl}
              playCount={pl.playCount}
            />
          </motion.div>
        ))}
      </motion.div>
    )
  }

  // Artists
  if (tabValue === 'artists') {
    const artists: Artist[] = data.result?.artists || []
    return (
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {artists.map((artist, index) => (
          <motion.div key={artist.id} variants={staggerItem} custom={index} className="text-center">
            <Link
              href={`/artist/${artist.id}`}
              className={cn(
                'group block rounded-full overflow-hidden mb-3 mx-auto max-w-[160px]',
                'hover-lift'
              )}
            >
              <div className="aspect-square rounded-full overflow-hidden">
                <Image
                  src={imageUrl(artist.picUrl || '', 160)}
                  alt={artist.name}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </Link>
            <p className="text-sm font-medium truncate">{artist.name}</p>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  // Albums
  if (tabValue === 'albums') {
    const albums: Album[] = data.result?.albums || []
    return (
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {albums.map((album, index) => (
          <motion.div key={album.id} variants={staggerItem} custom={index}>
            <Link
              href={`/album/${album.id}`}
              className={cn('group block hover-lift')}
            >
              <div className="aspect-square rounded-xl overflow-hidden mb-3 border border-transparent transition-all duration-300 group-hover:border-[var(--accent)]/30">
                <Image
                  src={imageUrl(album.picUrl, 200)}
                  alt={album.name}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                {album.name}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                {album.artist?.name}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  // MVs
  if (tabValue === 'mvs') {
    const mvs: MV[] = data.result?.mvs || []
    return (
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {mvs.map((mv, index) => (
          <motion.div key={mv.id} variants={staggerItem} custom={index}>
            <Link
              href={`/mv/${mv.id}`}
              className={cn('group block hover-lift')}
            >
              <div className="aspect-video rounded-xl overflow-hidden mb-3 border border-transparent transition-all duration-300 group-hover:border-[var(--accent)]/30">
                <Image
                  src={imageUrl(mv.cover || mv.picUrl, 320)}
                  alt={mv.name}
                  width={320}
                  height={180}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                {mv.name}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                {mv.artistName}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    )
  }

  return null
}

function SearchSkeleton({ tabValue }: { tabValue: string }) {
  if (tabValue === 'songs') {
    return (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="w-8 h-4 rounded bg-[var(--bg-surface)]" />
            <Skeleton className="w-10 h-10 rounded bg-[var(--bg-surface)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4 rounded bg-[var(--bg-surface)]" />
              <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-surface)]" />
            </div>
            <Skeleton className="h-3 w-12 rounded bg-[var(--bg-surface)]" />
          </div>
        ))}
      </div>
    )
  }

  if (tabValue === 'artists') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="aspect-square rounded-full mb-3 mx-auto max-w-[160px] bg-[var(--bg-surface)]" />
            <Skeleton className="h-3 w-16 rounded mx-auto bg-[var(--bg-surface)]" />
          </div>
        ))}
      </div>
    )
  }

  if (tabValue === 'mvs') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-video rounded-xl mb-3 bg-[var(--bg-surface)]" />
            <Skeleton className="h-3 w-3/4 rounded mb-2 bg-[var(--bg-surface)]" />
            <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-surface)]" />
          </div>
        ))}
      </div>
    )
  }

  // Playlists & Albums
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square rounded-xl mb-3 bg-[var(--bg-surface)]" />
          <Skeleton className="h-3 w-3/4 rounded mb-2 bg-[var(--bg-surface)]" />
          <Skeleton className="h-3 w-1/2 rounded bg-[var(--bg-surface)]" />
        </div>
      ))}
    </div>
  )
}

// Animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: i * 0.03,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
} as const

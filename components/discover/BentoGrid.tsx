'use client'

import { motion } from 'framer-motion'
import { Radio, Disc3, Sparkles, UserStar, AlertCircle, RefreshCw } from 'lucide-react'
import useSWR from 'swr'
import { BentoCard } from './BentoCard'
import { ncmApi } from '@/lib/api'
import { swrFetcher } from '@/lib/swr'
import { Button } from '@/components/ui/button'
import { imageUrl } from '@/lib/format'

interface RecommendPlaylist {
  id: number
  name: string
  picUrl: string
  playCount: number
}

interface NewSongItem {
  id: number
  name: string
  song: { al?: { picUrl?: string }; ar?: { name: string }[] }
  picUrl: string
}

interface ArtistItem {
  id: number
  name: string
  picUrl: string
  albumSize?: number
}

interface TopListCover {
  id: number
  name: string
  coverImgUrl: string
}

const FALLBACK_RADAR = {
  title: '私人雷达',
  subtitle: '根据你的听歌口味生成的专属推荐',
  badge: 'FOR YOU',
  accent: '#1ed760',
}

const FALLBACK_NEW_SONG = {
  title: '新歌速递',
  subtitle: '每日 10 首最新单曲',
  badge: 'NEW',
  accent: '#7c5cff',
}

const FALLBACK_HOT = {
  title: '热门歌单',
  subtitle: '万千用户都在听',
  badge: 'HOT',
  accent: '#ff6b6b',
}

const FALLBACK_ARTIST = {
  title: '艺人推荐',
  subtitle: '本周热门艺人',
  badge: 'ARTIST',
  accent: '#ffb84d',
}

/**
 * BentoGrid — 12-column mosaic layout for the discover page.
 *
 * Desktop layout (md+):
 *
 *  Row 1+2 ┌────────────┬──────────┬────────────┐
 *          │  Radar     │  Hot 1   │  New Songs │
 *          │  4 × 2     ├──────────┤  4 × 2     │
 *          │            │  Hot 2   │            │
 *          └────────────┴──────────┴────────────┘
 *  Row 3   ┌──────┬──────┬──────┬──────┐
 *          │ A1   │ A2   │ A3   │ A4   │   ← 3 cols each, 4 cards
 *          └──────┴──────┴──────┴──────┘
 *
 * Mobile collapses to a 12-col single-column stack with the two
 * feature cards (Radar / New Songs) spanning the full row.
 */
export function BentoGrid() {
  const { data: radarData, error: radarError, mutate: mutateRadar } = useSWR(
    'bento-radar',
    swrFetcher(async () => {
      const result = await ncmApi.personalized(1)
      const list = (result as { result?: RecommendPlaylist[] } | undefined)?.result || []
      return list[0]
    })
  )

  const { data: newSongData, error: newSongError, mutate: mutateNewSong } = useSWR(
    'bento-newsong',
    swrFetcher(async () => {
      const list = await ncmApi.personalizedNewSong<NewSongItem>(1)
      return list[0]
    })
  )

  const { data: topListData, error: topListError, mutate: mutateTopList } = useSWR(
    'bento-toplist',
    swrFetcher(async () => {
      const list = await ncmApi.toplist<TopListCover>()
      return list.slice(0, 2)
    })
  )

  const { data: artistData, error: artistError, mutate: mutateArtists } = useSWR(
    'bento-artists',
    swrFetcher(async () => {
      return await ncmApi.topArtists<ArtistItem>(4)
    })
  )

  const radar = radarData
  const newSong = newSongData
  const hotList = topListData || []
  const artists = artistData || []

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  } as const

  const allFailed = radarError && newSongError && topListError && artistError

  const retryAll = () => {
    mutateRadar()
    mutateNewSong()
    mutateTopList()
    mutateArtists()
  }

  if (allFailed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-[var(--bg-surface)] p-8 flex flex-col items-center justify-center gap-3 text-center"
      >
        <AlertCircle className="w-8 h-8 text-[var(--text-tertiary)]" />
        <p className="text-sm text-[var(--text-secondary)]">内容加载失败，请检查网络连接</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--accent-text)] hover:bg-[var(--accent)]/10 gap-1.5"
          onClick={retryAll}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重试
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      role="list"
      aria-label="Bento discover grid"
      className="grid grid-cols-12 gap-3 md:gap-4 auto-rows-[150px] md:auto-rows-[170px]"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Private Radar — large feature (4×2) */}
      <motion.div role="listitem" variants={item} className="col-span-12 md:col-span-4 md:row-span-2">
        <BentoCard
          size="lg"
          title={radar?.name ?? FALLBACK_RADAR.title}
          subtitle={FALLBACK_RADAR.subtitle}
          cover={radar?.picUrl}
          icon={Radio}
          badge={FALLBACK_RADAR.badge}
          accent={FALLBACK_RADAR.accent}
          href={radar ? `/playlist/${radar.id}` : '/discover/radar'}
          className="h-full"
        />
      </motion.div>

      {/* Hot playlist — medium 1 (4×1) */}
      {hotList[0] && (
        <motion.div role="listitem" variants={item} className="col-span-6 md:col-span-4 row-span-1">
          <BentoCard
            size="md"
            title={hotList[0].name}
            subtitle="查看详情"
            cover={imageUrl(hotList[0].coverImgUrl, 200)}
            icon={Disc3}
            badge={FALLBACK_HOT.badge}
            accent={FALLBACK_HOT.accent}
            href={`/leaderboard?id=${hotList[0].id}`}
            className="h-full"
          />
        </motion.div>
      )}

      {/* Hot playlist — medium 2 (4×1) */}
      {hotList[1] && (
        <motion.div role="listitem" variants={item} className="col-span-6 md:col-span-4 row-span-1">
          <BentoCard
            size="md"
            title={hotList[1].name}
            subtitle="查看详情"
            cover={imageUrl(hotList[1].coverImgUrl, 200)}
            icon={Disc3}
            badge={FALLBACK_HOT.badge}
            accent={FALLBACK_HOT.accent}
            href={`/leaderboard?id=${hotList[1].id}`}
            className="h-full"
          />
        </motion.div>
      )}

      {/* New Songs — large feature (4×2) */}
      <motion.div role="listitem" variants={item} className="col-span-12 md:col-span-4 md:row-span-2">
        <BentoCard
          size="lg"
          title={newSong?.name ?? FALLBACK_NEW_SONG.title}
          subtitle={FALLBACK_NEW_SONG.subtitle}
          cover={newSong?.picUrl || newSong?.song?.al?.picUrl}
          icon={Sparkles}
          badge={FALLBACK_NEW_SONG.badge}
          accent={FALLBACK_NEW_SONG.accent}
          href="/discover/newsongs"
          className="h-full"
        />
      </motion.div>

      {/* Artist cards — small (3×1) × 4 */}
      {artists.slice(0, 4).map((artist) => (
        <motion.div
          key={`artist-${artist.id}`}
          role="listitem"
          variants={item}
          className="col-span-6 md:col-span-3 row-span-1"
        >
          <BentoCard
            size="sm"
            title={artist.name}
            subtitle={artist.albumSize ? `${artist.albumSize} 张专辑` : '艺人'}
            cover={imageUrl(artist.picUrl, 200)}
            icon={UserStar}
            badge={FALLBACK_ARTIST.badge}
            accent={FALLBACK_ARTIST.accent}
            href={`/artist/${artist.id}`}
            className="h-full"
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

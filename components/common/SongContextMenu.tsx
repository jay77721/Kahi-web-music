'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import { useHistoryStore } from '@/stores/historyStore'
import { toast } from 'sonner'
import { ncmApi } from '@/lib/api'
import {
  Play,
  ListPlus,
  Heart,
  HeartOff,
  Disc3,
  User,
  Copy,
  Music,
} from 'lucide-react'
import type { Song } from '@/types/song'
import Image from 'next/image'
import { imageUrl } from '@/lib/format'

interface SongContextMenuProps {
  song: Song
  children: React.ReactNode
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '操作失败'
}

async function toggleLike(songId: number, like: boolean): Promise<void> {
  try {
    await ncmApi.like(songId, like)
    toast.success(like ? '已添加到喜欢' : '已取消喜欢')
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

function ContextMenuInner({ song }: { song: Song }) {
  const router = useRouter()
  const { playSong, addToQueue } = usePlayerStore()
  const { isLoggedIn } = useUserStore()
  const { add: addToHistory } = useHistoryStore()
  const menuRef = useRef<HTMLDivElement>(null)

  const [menu, setMenu] = useState<{ show: boolean; x: number; y: number }>({
    show: true, x: 0, y: 0,
  })
  const [fetchedLiked, setFetchedLiked] = useState(false)
  const isLiked = isLoggedIn && fetchedLiked

  const handleClose = useCallback(() => setMenu((s) => ({ ...s, show: false })), [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) handleClose()
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [handleClose])

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    ncmApi
      .songLikeCheck([song.id])
      .then((res) => {
        if (cancelled) return
        const data = res as { success?: boolean; ids?: Record<number, boolean> }
        const liked = data?.ids?.[song.id] ?? false
        setFetchedLiked(liked)
      })
      .catch(() => {
        if (!cancelled) setFetchedLiked(false)
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, song.id])

  const maxY = window.innerHeight - 380
  const maxX = window.innerWidth - 210

  const handleToggleLike = useCallback(() => {
    if (!isLoggedIn) {
      toast.error('请先登录')
      handleClose()
      return
    }
    const next = !isLiked
    setFetchedLiked(next)
    void toggleLike(song.id, next)
    handleClose()
  }, [isLoggedIn, isLiked, song.id, handleClose])

  const handleViewSimilar = useCallback(() => {
    router.push(`/song/${song.id}?tab=similar`)
    handleClose()
  }, [router, song.id, handleClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-[210px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl py-1.5 animate-fade-in overflow-hidden backdrop-blur-xl"
      style={{ left: Math.min(menu.x, maxX), top: Math.min(menu.y, maxY) }}
    >
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-[var(--bg-hover)] transition-colors"
      >
        <Copy className="w-3 h-3 rotate-45 text-[var(--text-tertiary)]" />
      </button>
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2.5">
        {song.al?.picUrl ? (
          <Image
            src={imageUrl(song.al.picUrl, 60)}
            alt="Album cover"
            width={48}
            height={48}
            className="w-8 h-8 rounded object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center">
            <Disc3 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          </div>
        )}
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-xs font-medium truncate text-[var(--text-primary)]">{song.name}</p>
          <p className="text-[10px] truncate text-[var(--text-tertiary)]">{song.ar?.map((a) => a.name).join(' / ')}</p>
        </div>
      </div>
      {[
        { icon: Play, label: '立即播放', action: () => { addToHistory(song); playSong(song); handleClose() } },
        { icon: ListPlus, label: '添加到队列', action: () => { addToQueue(song); handleClose() } },
        { icon: isLiked ? HeartOff : Heart, label: isLiked ? '取消收藏' : '收藏', action: handleToggleLike, disabled: !isLoggedIn },
        { icon: Music, label: '查看相似歌曲', action: handleViewSimilar },
        ...(song.al?.id ? [{ icon: Disc3, label: '查看专辑', action: () => { router.push(`/album/${song.al!.id}`); handleClose() } }] : []),
        ...(song.ar?.[0]?.id ? [{ icon: User, label: '查看歌手', action: () => { router.push(`/artist/${song.ar![0].id}`); handleClose() } }] : []),
        { icon: Copy, label: '复制歌名', action: () => { navigator.clipboard?.writeText(song.name); handleClose() } },
      ].map((item, idx) => (
        <button
          key={idx}
          disabled={item.disabled}
          onClick={item.action}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
            item.disabled
              ? 'text-[var(--text-tertiary)] cursor-not-allowed opacity-50'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <item.icon className="w-3.5 h-3.5 shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export function SongContextMenu({ children }: Omit<SongContextMenuProps, 'song'>) {
  const [menu, setMenu] = useState<{ show: boolean; x: number; y: number; song: Song | null }>({
    show: false, x: 0, y: 0, song: null,
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const row = target.closest('[data-song-id]') as HTMLElement
      if (!row) return
      e.preventDefault()
      const s: Song = {
        id: Number(row.dataset.songId),
        name: row.dataset.songName || '',
        ar: [{ id: 0, name: row.dataset.songArtist || '' }],
        al: { id: 0, name: row.dataset.songAlbum || '', picUrl: row.dataset.songPic || '' },
        dt: Number(row.dataset.songDuration) || 0,
        publishTime: 0,
        fee: 0,
        noCopyrightRcmd: null,
        mv: 0,
      }
      setMenu({ show: true, x: e.clientX, y: e.clientY, song: s })
    }
    window.addEventListener('contextmenu', handler)
    return () => window.removeEventListener('contextmenu', handler)
  }, [])

  return (
    <>
      {children}
      {menu.show && menu.song && <ContextMenuInner song={menu.song} />}
    </>
  )
}

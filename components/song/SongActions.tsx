'use client'

import { memo, useCallback } from 'react'
import { Heart, Download, Share2, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import { ncmApi } from '@/lib/api'
import { copyToClipboard, buildWebShareData, getShareUrl } from '@/lib/share'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/song'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SongActionsProps {
  song: Song
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'accent' | 'ghost'
  testId?: string
  disabled?: boolean
}

function ActionButton({ label, icon, onClick, variant = 'default', testId, disabled }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg',
        'h-9 px-3 text-sm font-medium',
        'transition-all duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        variant === 'accent' && 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] shadow-[var(--shadow-md)]',
        variant === 'default' && 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]',
        variant === 'ghost' && 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      )}
    >
      <span aria-hidden="true" className="[&_svg]:w-4 [&_svg]:h-4">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Action strip beneath the song hero: play, like, download, share.
 * All callbacks are local — callers can wrap or override via the store
 * or user store if they need different behavior.
 */
function SongActionsImpl({ song, className }: SongActionsProps) {
  const playSong = usePlayerStore((state) => state.playSong)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const pause = usePlayerStore((state) => state.pause)
  const resume = usePlayerStore((state) => state.resume)
  const { isLoggedIn } = useUserStore()

  const isCurrent = currentTrackId === song.id
  const shareTitle = song.name?.trim() || '未知歌曲'

  const handlePlay = useCallback(() => {
    if (isCurrent) {
      if (isPlaying) {
        pause()
      } else {
        resume()
      }
    } else {
      playSong(song)
    }
  }, [isCurrent, isPlaying, pause, resume, playSong, song])

  const handleLike = useCallback(() => {
    if (!isLoggedIn) {
      toast.error('请先登录')
      return
    }
    // Optimistic: assume we are about to flip on; the store will revalidate.
    void toggleLike(song.id, true)
  }, [isLoggedIn, song.id])

  const handleDownload = useCallback(() => {
    if (isLoggedIn) {
      toast.success('已加入下载队列')
    } else {
      toast.error('请先登录')
    }
  }, [isLoggedIn])

  const handleShare = useCallback(async () => {
    const url = getShareUrl('song', song.id)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(buildWebShareData('song', song.id, shareTitle))
        toast.success('已分享')
        return
      } catch (error: unknown) {
        // User cancelled or share failed — fall through to clipboard.
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
    const result = await copyToClipboard(url)
    if (result.ok) {
      toast.success('链接已复制')
    } else {
      toast.error('复制失败，请手动复制')
    }
  }, [song.id, shareTitle])

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      data-testid="song-actions"
      role="toolbar"
      aria-label="歌曲操作"
    >
      <ActionButton
        label={isCurrent && isPlaying ? '暂停' : '播放'}
        icon={isCurrent && isPlaying ? <Pause /> : <Play />}
        onClick={handlePlay}
        variant="accent"
        testId="song-action-play"
      />
      <ActionButton
        label="收藏"
        icon={<Heart />}
        onClick={handleLike}
        testId="song-action-like"
      />
      <ActionButton
        label="下载"
        icon={<Download />}
        onClick={handleDownload}
        testId="song-action-download"
      />
      <ActionButton
        label="分享"
        icon={<Share2 />}
        onClick={handleShare}
        testId="song-action-share"
      />
    </div>
  )
}

export const SongActions = memo(SongActionsImpl)

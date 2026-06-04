'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Copy,
  Disc3,
  Heart,
  HeartOff,
  ListPlus,
  Music,
  Play,
  User,
} from 'lucide-react'
import { ncmApi } from '@/lib/api'
import { imageUrl } from '@/lib/format'
import { useHistoryStore } from '@/stores/historyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import type { Song } from '@/types/song'

interface SongContextMenuProps {
  children: ReactNode
}

interface SongContextMenuState {
  isOpen: boolean
  x: number
  y: number
  song: Song | null
}

interface SongContextMenuController {
  openMenu: (song: Song, x: number, y: number) => void
  closeMenu: () => void
}

interface ContextMenuInnerProps {
  song: Song
  x: number
  y: number
  onClose: () => void
}

const MENU_WIDTH = 210
const MENU_ESTIMATED_HEIGHT = 380
const VIEWPORT_PADDING = 8

const SongContextMenuContext = createContext<SongContextMenuController | null>(null)

export function useSongContextMenu(): SongContextMenuController | null {
  return useContext(SongContextMenuContext)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '操作失败'
}

function getMenuPosition(x: number, y: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: x, top: y }

  const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)
  const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - MENU_ESTIMATED_HEIGHT - VIEWPORT_PADDING)

  return {
    left: Math.min(Math.max(x, VIEWPORT_PADDING), maxLeft),
    top: Math.min(Math.max(y, VIEWPORT_PADDING), maxTop),
  }
}

async function toggleLike(songId: number, like: boolean): Promise<void> {
  try {
    await ncmApi.like(songId, like)
    toast.success(like ? '已添加到喜欢' : '已取消喜欢')
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

function ContextMenuInner({ song, x, y, onClose }: ContextMenuInnerProps) {
  const router = useRouter()
  const { playSong, addToQueue } = usePlayerStore()
  const { isLoggedIn } = useUserStore()
  const { add: addToHistory } = useHistoryStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const [fetchedLiked, setFetchedLiked] = useState(false)
  const isLiked = isLoggedIn && fetchedLiked
  const position = getMenuPosition(x, y)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      onClose()
    }

    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [onClose])

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

  const handleToggleLike = useCallback(() => {
    if (!isLoggedIn) {
      toast.error('请先登录')
      onClose()
      return
    }

    const next = !isLiked
    setFetchedLiked(next)
    void toggleLike(song.id, next)
    onClose()
  }, [isLoggedIn, isLiked, song.id, onClose])

  const handleViewSimilar = useCallback(() => {
    router.push(`/song/${song.id}?tab=similar`)
    onClose()
  }, [router, song.id, onClose])

  const menuItems = [
    {
      icon: Play,
      label: '立即播放',
      action: () => {
        addToHistory(song)
        playSong(song)
        onClose()
      },
    },
    {
      icon: ListPlus,
      label: '添加到队列',
      action: () => {
        addToQueue(song)
        onClose()
      },
    },
    {
      icon: isLiked ? HeartOff : Heart,
      label: isLiked ? '取消收藏' : '收藏',
      action: handleToggleLike,
      disabled: !isLoggedIn,
    },
    { icon: Music, label: '查看相似歌曲', action: handleViewSimilar },
    ...(song.al?.id
      ? [
          {
            icon: Disc3,
            label: '查看专辑',
            action: () => {
              router.push(`/album/${song.al!.id}`)
              onClose()
            },
          },
        ]
      : []),
    ...(song.ar?.[0]?.id
      ? [
          {
            icon: User,
            label: '查看歌手',
            action: () => {
              router.push(`/artist/${song.ar![0].id}`)
              onClose()
            },
          },
        ]
      : []),
    {
      icon: Copy,
      label: '复制歌名',
      action: () => {
        void navigator.clipboard?.writeText(song.name)
        onClose()
      },
    },
  ]

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`${song.name} 的操作菜单`}
      className="fixed z-[100] w-[210px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl py-1.5 animate-fade-in overflow-hidden backdrop-blur-xl"
      style={{ left: position.left, top: position.top }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭歌曲操作菜单"
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-colors"
      >
        <Copy className="w-3 h-3 rotate-45 text-[var(--text-tertiary)]" aria-hidden="true" />
      </button>
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2.5">
        {song.al?.picUrl ? (
          <Image
            src={imageUrl(song.al.picUrl, 60)}
            alt={song.al.name ? `${song.al.name} 封面` : '专辑封面'}
            width={48}
            height={48}
            className="w-8 h-8 rounded object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center" aria-hidden="true">
            <Disc3 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          </div>
        )}
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-xs font-medium truncate text-[var(--text-primary)]">{song.name}</p>
          <p className="text-[10px] truncate text-[var(--text-tertiary)]">
            {song.ar?.map((artist) => artist.name).join(' / ')}
          </p>
        </div>
      </div>
      {menuItems.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={item.action}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
            item.disabled
              ? 'text-[var(--text-tertiary)] cursor-not-allowed opacity-50'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:bg-[var(--bg-hover)] focus-visible:text-[var(--text-primary)]'
          }`}
        >
          <item.icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export function SongContextMenu({ children }: SongContextMenuProps) {
  const [menu, setMenu] = useState<SongContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    song: null,
  })

  const openMenu = useCallback((song: Song, x: number, y: number) => {
    setMenu({ isOpen: true, x, y, song })
  }, [])

  const closeMenu = useCallback(() => {
    setMenu((current) => ({ ...current, isOpen: false }))
  }, [])

  const controller = useMemo(
    () => ({ openMenu, closeMenu }),
    [closeMenu, openMenu]
  )

  return (
    <SongContextMenuContext.Provider value={controller}>
      {children}
      {menu.isOpen && menu.song && (
        <ContextMenuInner song={menu.song} x={menu.x} y={menu.y} onClose={closeMenu} />
      )}
    </SongContextMenuContext.Provider>
  )
}

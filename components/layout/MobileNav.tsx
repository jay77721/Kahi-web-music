'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Search, Heart, Headphones, User, Play, Cloud, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/liked', label: '收藏', icon: Heart },
  { href: '/cloud', label: '云盘', icon: Cloud },
  { href: '/radio', label: '电台', icon: Headphones },
  { href: '/login', label: '登录', icon: User },
  { href: '/settings', label: '设置', icon: SettingsIcon },
]

export function MobileNav() {
  const pathname = usePathname()
  const { currentTrack, isPlaying } = usePlayerStore()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-t border-[var(--border)]">
      {/* Now Playing indicator bar */}
      {currentTrack && (
        <button
          type="button"
          onClick={() => useUIStore.getState().setFullScreenPlayerOpen(true)}
          aria-label={`打开正在播放：${currentTrack.name}`}
          className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] w-full text-left"
        >
          <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 relative">
            {currentTrack.al?.picUrl && (
              <Image
                src={currentTrack.al.picUrl + '?param=60y60'}
                alt=""
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            )}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex items-end gap-[1px] h-3">
                  <span className="w-[2px] bg-[var(--accent)] rounded-sm animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                  <span className="w-[2px] bg-[var(--accent)] rounded-sm animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                  <span className="w-[2px] bg-[var(--accent)] rounded-sm animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{currentTrack.name}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] truncate">
              {currentTrack.ar?.map(a => a.name).join(' / ')}
            </p>
          </div>
          <Play className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
        </button>
      )}

      {/* Navigation tabs */}
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)]'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-[2px] rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

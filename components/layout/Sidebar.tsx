'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home, Music, ListMusic, Radio, Headphones,
  Heart, Clock, Cloud, User, ChevronLeft, ChevronRight, Plus,
  Music2, Settings as SettingsIcon,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useUserStore } from '@/stores/userStore'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const mainNavItems = [
  { href: '/', label: '发现音乐', icon: Home },
  { href: '/leaderboard', label: '排行榜', icon: ListMusic },
  { href: '/daily', label: '每日推荐', icon: Music },
  { href: '/fm', label: '私人FM', icon: Radio },
  { href: '/radio', label: '电台', icon: Headphones },
]

const myNavItems = [
  { href: '/my?tab=liked', label: '我喜欢的', icon: Heart },
  { href: '/my?tab=recent', label: '最近播放', icon: Clock },
  { href: '/cloud', label: '云盘', icon: Cloud },
]

const placeholderPlaylists = [
  { id: 1, name: '我喜欢的音乐', playCount: 0 },
  { id: 2, name: '最近播放', playCount: 0 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { isLoggedIn, profile } = useUserStore()

  const navLink = (item: { href: string; label: string; icon: React.ElementType }) => {
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3.5 px-3 py-3 rounded-2xl mb-1 transition-all duration-200 relative group',
          isActive
            ? 'text-[var(--text-primary)] bg-[var(--bg-elevated)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        )}
      >
        {isActive && (
          <motion.span
            layoutId="sidebarActive"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[var(--accent)]"
            style={{ boxShadow: '0 0 10px var(--accent-glow)' }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
          />
        )}
        <Icon className={cn(
          'w-[20px] h-[20px] flex-shrink-0 transition-all duration-200',
          isActive ? 'text-[var(--accent)] scale-110' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:scale-110'
        )} />
        <span className={cn(
          'text-[15px] font-semibold tracking-wide truncate',
          isActive && 'text-[var(--text-primary)]'
        )}>
          {item.label}
        </span>
      </Link>
    )
  }

  // Collapsed state
  if (!sidebarOpen) {
    return (
      <aside className="hidden md:flex flex-col items-center w-[76px] bg-[var(--bg-primary)] border-r border-[var(--border)] py-5 transition-all duration-300">
        {/* Logo */}
        <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] flex items-center justify-center mb-8"
          style={{ boxShadow: '0 0 20px var(--accent-glow)' }}>
          <Music2 className="w-6 h-6 text-[var(--text-inverse)]" strokeWidth={2.5} />
        </div>

        <button
          onClick={toggleSidebar}
          className="p-3 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 transition-all duration-200"
          aria-label="展开侧边栏"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <nav className="flex flex-col items-center gap-3 flex-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'p-3.5 rounded-2xl transition-all duration-200 relative',
                  isActive ? 'bg-[var(--bg-elevated)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
                title={item.label}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent)]"
                    style={{ boxShadow: '0 0 8px var(--accent-glow)' }}
                  />
                )}
                <Icon className="w-6 h-6" />
              </Link>
            )
          })}

          {/* Settings (collapsed) */}
          <Link
            href="/settings"
            data-testid="sidebar-settings"
            aria-current={pathname === '/settings' ? 'page' : undefined}
            className={cn(
              'p-3.5 rounded-2xl transition-all duration-200 relative',
              pathname === '/settings' ? 'bg-[var(--bg-elevated)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
            title="设置"
          >
            {pathname === '/settings' && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent)]"
                style={{ boxShadow: '0 0 8px var(--accent-glow)' }}
              />
            )}
            <SettingsIcon className="w-6 h-6" />
          </Link>
        </nav>

        {/* Bottom: user */}
        <div className="mt-auto">
          {isLoggedIn && profile ? (
            <Link
              href={`/user/${profile.userId}`}
              className="block p-2 rounded-2xl hover:bg-[var(--bg-hover)] transition-all duration-200"
              title={profile.nickname}
            >
              <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] overflow-hidden border-2 border-[var(--border-light)]">
                {profile.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt="" width={36} height={36} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              className="block p-2 rounded-2xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
              title="登录"
            >
              <User className="w-5 h-5" />
            </Link>
          )}
        </div>
      </aside>
    )
  }

  // Expanded state
  return (
    <aside className="hidden md:flex flex-col w-[280px] bg-[var(--bg-primary)] border-r border-[var(--border)] relative transition-all duration-300">
      {/* Brand header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-[var(--accent)] opacity-15 group-hover:opacity-25 transition-opacity duration-300"
              style={{ boxShadow: '0 0 20px var(--accent-glow)' }}
            />
            <Music2 className="w-6 h-6 text-[var(--accent)] relative z-10" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[18px] tracking-tight text-[var(--text-primary)]">KaQi Music</span>
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
          aria-label="收起侧边栏"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* Main navigation */}
        <nav className="mb-2">
          {mainNavItems.map((item) => navLink(item))}
        </nav>

        <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        {/* My music */}
        <nav className="mb-2">
          <p className="px-3 py-2 text-[11px] font-bold text-[var(--text-quaternary)] uppercase tracking-[0.15em]">
            我的音乐
          </p>
          {myNavItems.map((item) => navLink(item))}
        </nav>

        <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        {/* Playlists */}
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[11px] font-bold text-[var(--text-quaternary)] uppercase tracking-[0.15em]">
              歌单
            </p>
            <button
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {placeholderPlaylists.map((pl) => (
            <Link
              key={pl.id}
              href={`/playlist/${pl.id}`}
              className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl mb-1 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
                <Music2 className="w-4 h-4 text-[var(--text-tertiary)]" />
              </div>
              <span className="truncate font-medium">{pl.name}</span>
            </Link>
          ))}
        </div>

        <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        {/* Settings (expanded) */}
        <nav className="mb-2">
          <Link
            href="/settings"
            data-testid="sidebar-settings"
            aria-current={pathname === '/settings' ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3.5 px-3 py-3 rounded-2xl mb-1 transition-all duration-200 relative group',
              pathname === '/settings'
                ? 'text-[var(--text-primary)] bg-[var(--bg-elevated)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            {pathname === '/settings' && (
              <motion.span
                layoutId="sidebarActive"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[var(--accent)]"
                style={{ boxShadow: '0 0 10px var(--accent-glow)' }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              />
            )}
            <SettingsIcon className={cn(
              'w-[20px] h-[20px] flex-shrink-0 transition-all duration-200',
              pathname === '/settings' ? 'text-[var(--accent)] scale-110' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:scale-110'
            )} />
            <span className={cn(
              'text-[15px] font-semibold tracking-wide truncate',
              pathname === '/settings' && 'text-[var(--text-primary)]'
            )}>
              设置
            </span>
          </Link>
        </nav>

        {/* User section */}
        <div className="mt-3 mb-4">
          {isLoggedIn && profile ? (
            <Link
              href={`/user/${profile.userId}`}
              className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] overflow-hidden border-2 border-[var(--border-light)] flex-shrink-0">
                {profile.avatarUrl && (
                  <Image src={profile.avatarUrl} alt="" width={36} height={36} className="w-full h-full object-cover" />
                )}
              </div>
              <span className="truncate font-medium">{profile.nickname}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 border-2 border-[var(--border)]">
                <User className="w-4 h-4 text-[var(--text-tertiary)]" />
              </div>
              <span className="font-medium">登录</span>
            </Link>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

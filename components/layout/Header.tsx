'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, User, Menu, Sun, Moon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { useUserStore } from '@/stores/userStore'
import { useIsMobile } from '@/hooks/useMediaQuery'

export function Header() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const { theme, setTheme, setSearchOpen, toggleSidebar } = useUIStore()
  const { isLoggedIn, profile } = useUserStore()
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const q = searchValue.trim()
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`)
      }
    },
    [searchValue, router]
  )

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-3 md:px-6 h-14 bg-[var(--bg-primary)] border-b border-[var(--border)]">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            onClick={toggleSidebar}
            aria-label="菜单"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Navigation arrows (desktop/tablet) */}
        {!isMobile && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-150"
              aria-label="后退"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.forward()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-150"
              aria-label="前进"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Center: Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-[420px] mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <Input
            type="search"
            placeholder="你想听什么？"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="w-full pl-10 h-9 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full text-sm transition-all duration-200 placeholder:text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-light)] focus-visible:bg-[var(--bg-elevated)] focus-visible:border-[var(--border-strong)] focus-visible:ring-0"
          />
        </div>
      </form>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="切换主题"
          >
            {mounted && theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        )}

        {/* User profile / login */}
        {isLoggedIn && profile ? (
          <Link href={`/user/${profile.userId}`}>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--border-strong)] transition-all duration-150 cursor-pointer">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.nickname} width={32} height={32} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              )}
            </div>
          </Link>
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150">
              <User className="w-4 h-4 mr-1.5" />
              <span className="hidden md:inline">登录</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}

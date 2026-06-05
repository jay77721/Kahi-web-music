'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Search, User, Sun, Moon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { useUserStore } from '@/stores/userStore'

export function Header() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const { theme, setTheme, setSearchOpen } = useUIStore()
  const { isLoggedIn, profile } = useUserStore()

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
    <header className="sticky top-0 z-30 flex items-center gap-2 md:gap-3 px-3 md:px-6 h-14 bg-[var(--bg-primary)] border-b border-[var(--border)]">
      {/* Center: search bar */}
      <form onSubmit={handleSearch} className="min-w-0 flex-1 md:max-w-[420px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <Input
            type="search"
            placeholder="你想听什么？"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            aria-label="搜索音乐"
            className="w-full pl-10 h-9 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full text-sm transition-all duration-200 placeholder:text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-light)] focus-visible:bg-[var(--bg-elevated)] focus-visible:border-[var(--border-strong)] focus-visible:ring-0"
          />
        </div>
      </form>

      {/* Right section */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex w-8 h-8 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="切换主题"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {isLoggedIn && profile ? (
          <Link href={`/user/${profile.userId}`}>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--border-strong)] transition-all duration-150 cursor-pointer">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
              )}
            </div>
          </Link>
        ) : (
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              aria-label="登录"
              className="h-9 w-9 p-0 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-150 md:h-8 md:w-auto md:px-3 md:rounded-[min(var(--radius-md),12px)]"
            >
              <User className="w-4 h-4 md:mr-1.5" />
              <span className="hidden md:inline">登录</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Heart, User, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/liked', label: '收藏', icon: Heart },
  { href: '/my', label: '我的', icon: User },
  { href: '/settings', label: '设置', icon: SettingsIcon },
]

function isNavItemActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'

  if (href === '/my') {
    return (
      pathname === '/my' ||
      pathname.startsWith('/my/') ||
      pathname === '/user' ||
      pathname.startsWith('/user/')
    )
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="移动主导航"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg-primary)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* Navigation tabs */}
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = isNavItemActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)]'
              )}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] leading-none">{item.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 w-4 h-[2px] rounded-full bg-[var(--accent)]"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

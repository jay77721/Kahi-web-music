'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Music2, QrCode, Smartphone } from 'lucide-react'
import { useUserStore } from '@/stores/userStore'
import { PhoneLoginForm } from './_components/PhoneLoginForm'
import { QRLoginPanel } from './_components/QRLoginPanel'

type TabValue = 'phone' | 'qr'

const TABS: ReadonlyArray<{ value: TabValue; label: string; icon: typeof Smartphone }> = [
  { value: 'phone', label: '手机号登录', icon: Smartphone },
  { value: 'qr', label: '扫码登录', icon: QrCode },
]

const DEFAULT_ACCENT_OKLCH = 'oklch(0.78 0.18 145)'
const LOGIN_BACKGROUND_STYLE = {
  background: `
    radial-gradient(ellipse at 20% 50%, color-mix(in oklch, ${DEFAULT_ACCENT_OKLCH} 10%, transparent) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, color-mix(in oklch, ${DEFAULT_ACCENT_OKLCH} 6%, transparent) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, color-mix(in oklch, var(--accent) 4%, transparent) 0%, transparent 50%),
    var(--bg-primary)
  `,
} as const

export default function LoginPage() {
  const router = useRouter()
  const isLoggedIn = useUserStore((s) => s.isLoggedIn)
  const hasRestoredSession = useUserStore((s) => s.hasRestoredSession)
  const [activeTab, setActiveTab] = useState<TabValue>('phone')
  const hasRedirectedRef = useRef(false)
  const isRestoringSession = !hasRestoredSession

  useEffect(() => {
    if (!isLoggedIn || hasRedirectedRef.current) return

    hasRedirectedRef.current = true
    router.replace('/my')
  }, [isLoggedIn, router])

  if (isRestoringSession || isLoggedIn) {
    return (
      <main
        className="relative min-h-dvh flex items-center justify-center overflow-hidden px-4 bg-[var(--bg-primary)] text-[var(--text-tertiary)]"
        style={LOGIN_BACKGROUND_STYLE}
      >
        <p role="status" aria-live="polite" className="text-sm">
          {isLoggedIn ? '正在进入个人页...' : '正在恢复登录状态...'}
        </p>
      </main>
    )
  }

  return (
    <main
      className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden px-4 bg-[var(--bg-primary)] text-[var(--text-primary)]"
      style={LOGIN_BACKGROUND_STYLE}
      aria-labelledby="login-heading"
    >
      <BackButton onClick={() => router.push('/')} />
      <BrandHeader />

      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--bg-elevated)]/80 backdrop-blur-xl animate-slide-up"
        style={{
          animationDelay: '150ms',
          boxShadow: 'var(--shadow-lg), inset 0 1px 0 var(--border-subtle)',
        }}
      >
        <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
        <div className="p-6">
          {activeTab === 'phone' ? (
            <div
              key="phone"
              id="tab-panel-phone"
              role="tabpanel"
              aria-labelledby="login-tab-phone"
              className="animate-slide-up"
            >
              <PhoneLoginForm />
            </div>
          ) : (
            <div
              key="qr"
              id="tab-panel-qr"
              role="tabpanel"
              aria-labelledby="login-tab-qr"
              className="animate-slide-up"
            >
              <QRLoginPanel />
            </div>
          )}
        </div>
        <LegalFooter />
      </div>
    </main>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="返回首页"
      className="fixed top-5 left-5 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}

function BrandHeader() {
  return (
    <div className="relative text-center mb-8">
      <div
        className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4"
        style={{ boxShadow: '0 0 40px var(--accent-glow), var(--shadow-lg)' }}
      >
        <Music2 className="w-8 h-8 text-[var(--accent-foreground)]" strokeWidth={2.5} />
      </div>
      <h1 id="login-heading" className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        Kahi Music
      </h1>
      <p className="text-sm text-[var(--text-tertiary)] mt-1.5">登录后享受更多服务</p>
    </div>
  )
}

interface TabSwitcherProps {
  activeTab: TabValue
  onChange: (next: TabValue) => void
}

function TabSwitcher({ activeTab, onChange }: TabSwitcherProps) {
  return (
    <div role="tablist" aria-label="登录方式" className="flex border-b border-[var(--border)]">
      {TABS.map(({ value, label, icon: Icon }) => {
        const isActive = activeTab === value
        return (
          <button
            key={value}
            type="button"
            id={`login-tab-${value}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tab-panel-${value}`}
            data-state={isActive ? 'active' : 'inactive'}
            onClick={() => onChange(value)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all duration-300 relative ${
              isActive
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function LegalFooter() {
  return (
    <div className="px-6 pb-5">
      <p className="text-center text-[11px] text-[var(--text-quaternary)]">
        登录即表示同意{' '}
        <button
          type="button"
          className="text-[var(--text-tertiary)] hover:text-[var(--accent-text)] cursor-pointer transition-colors bg-transparent border-none p-0 text-[11px]"
          aria-label="查看用户协议"
        >
          用户协议
        </button>{' '}
        和{' '}
        <button
          type="button"
          className="text-[var(--text-tertiary)] hover:text-[var(--accent-text)] cursor-pointer transition-colors bg-transparent border-none p-0 text-[11px]"
          aria-label="查看隐私政策"
        >
          隐私政策
        </button>
      </p>
    </div>
  )
}

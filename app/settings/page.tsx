'use client'

import { useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  Settings as SettingsIcon,
  Monitor,
  Sun,
  Moon,
  Music2,
  Download,
  Bell,
  Keyboard,
  Info,
  Sparkles,
  Repeat,
  Repeat1,
  Shuffle,
  ListOrdered,
  FolderOpen,
  Palette,
  Headphones,
  Gauge,
  HardDrive,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsRow } from '@/components/settings/SettingsRow'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { useUIStore } from '@/stores/uiStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useUserStore } from '@/stores/userStore'
import { storage } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { PlayMode } from '@/types/api'

type Theme = 'dark' | 'light' | 'system'

interface AudioQuality {
  value: string
  label: string
  bitrate: string
}

const QUALITY_OPTIONS: readonly AudioQuality[] = [
  { value: 'standard', label: '标准', bitrate: '128 kbps' },
  { value: 'higher', label: '较高', bitrate: '192 kbps' },
  { value: 'exhigh', label: '极高', bitrate: '320 kbps' },
  { value: 'lossless', label: '无损', bitrate: 'FLAC' },
  { value: 'hires', label: 'Hi-Res', bitrate: '24bit' },
] as const

const PLAY_MODE_LABELS: Readonly<Record<PlayMode, string>> = {
  'sequential': '列表循环',
  'shuffle': '随机播放',
  'repeat-one': '单曲循环',
  'repeat-all': '列表播放',
}

const KEYBOARD_SHORTCUTS: ReadonlyArray<{ keys: string; action: string }> = [
  { keys: 'Space', action: '播放 / 暂停' },
  { keys: 'Right', action: '下一首' },
  { keys: 'Left', action: '上一首' },
  { keys: 'Up', action: '音量 +' },
  { keys: 'Down', action: '音量 -' },
  { keys: 'M', action: '静音 / 取消静音' },
  { keys: 'F', action: '全屏播放器' },
]

const APP_VERSION = '0.1.0'
const APP_LICENSE = 'MIT'
const LOGOUT_ERROR_FALLBACK = '退出登录请求失败，服务器会话可能仍然有效'
const DEFAULT_QUALITY = 'exhigh'
const DEFAULT_DOWNLOAD_DIR = '~/Downloads/KahiMusic'
const DEFAULT_NOTIFICATIONS_ENABLED = true

function getLogoutErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return LOGOUT_ERROR_FALLBACK
}

/**
 * SegmentedControl - small primitive for choosing one of N options.
 * Pure presentational, controlled.
 */
interface SegmentedControlProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode }>
  onChange: (next: T) => void
  ariaLabel: string
  compact?: boolean
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-1',
        compact ? 'sm:w-fit sm:flex-nowrap' : 'sm:w-full',
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`segment-${opt.value}`}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-8 min-w-[4.75rem] flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
              compact && 'sm:min-w-0 sm:flex-none',
              selected
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-[0_0_12px_var(--accent-glow)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
  id?: string
}

function ToggleSwitch({ checked, onChange, ariaLabel, id }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid={`toggle-${ariaLabel}`}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full border border-[var(--border)] transition-colors flex-shrink-0',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-overlay)]',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

interface SummaryItemProps {
  icon: ReactNode
  label: string
  value: string
}

function SummaryItem({ icon, label, value }: SummaryItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)]">
          {icon}
        </span>
        <span className="truncate text-xs text-[var(--text-tertiary)]">{label}</span>
      </div>
      <span className="shrink-0 text-xs font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore()
  const { playMode, setPlayMode } = usePlayerStore()
  const { isLoggedIn, logout } = useUserStore()

  const [quality, setQuality] = useState<string>(DEFAULT_QUALITY)
  const [downloadDir, setDownloadDir] = useState<string>(DEFAULT_DOWNLOAD_DIR)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    DEFAULT_NOTIFICATIONS_ENABLED,
  )
  const [hasLoadedLocalSettings, setHasLoadedLocalSettings] = useState(false)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      setQuality(storage.get('play:quality', DEFAULT_QUALITY))
      setDownloadDir(storage.get('download:dir', DEFAULT_DOWNLOAD_DIR))
      setNotificationsEnabled(storage.get('notifications:enabled', DEFAULT_NOTIFICATIONS_ENABLED))
      setHasLoadedLocalSettings(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedLocalSettings) return
    storage.set('play:quality', quality)
  }, [hasLoadedLocalSettings, quality])

  useEffect(() => {
    if (!hasLoadedLocalSettings) return
    storage.set('download:dir', downloadDir)
  }, [downloadDir, hasLoadedLocalSettings])

  useEffect(() => {
    if (!hasLoadedLocalSettings) return
    storage.set('notifications:enabled', notificationsEnabled)
  }, [hasLoadedLocalSettings, notificationsEnabled])

  const handleThemeChange = useCallback(
    (next: Theme) => {
      setTheme(next)
    },
    [setTheme],
  )

  const handlePlayModeChange = useCallback(
    (next: PlayMode) => {
      setPlayMode(next)
    },
    [setPlayMode],
  )

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      toast.success('已退出登录')
    } catch (error) {
      toast.error(getLogoutErrorMessage(error))
    }
  }, [logout])

  const themeIcon = (t: Theme) => {
    if (t === 'system') return <Monitor className="w-3.5 h-3.5" />
    if (t === 'light') return <Sun className="w-3.5 h-3.5" />
    return <Moon className="w-3.5 h-3.5" />
  }
  const currentQuality = QUALITY_OPTIONS.find((q) => q.value === quality) ?? QUALITY_OPTIONS[2]

  return (
    <AppShell>
      <section
        data-testid="settings-page"
        className="min-h-full bg-[var(--bg-secondary)] px-4 py-4 md:px-6 md:py-6"
      >
        <div className="mx-auto max-w-5xl">
          <header className="mb-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10"
                style={{ boxShadow: '0 0 18px var(--accent-glow)' }}
              >
                <SettingsIcon className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-normal">
                  设置
                </h1>
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                  个性化你的 Kahi Music 体验
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">当前偏好</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">本机保存，即时生效</p>
                  </div>
                  <span className="rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-1 text-xs font-medium text-[var(--accent-text)]">
                    Live
                  </span>
                </div>
                <div className="space-y-2">
                  <SummaryItem
                    icon={themeIcon(theme)}
                    label="主题"
                    value={theme === 'system' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}
                  />
                  <SummaryItem
                    icon={<Gauge className="size-3.5" />}
                    label="优先音质"
                    value={currentQuality.bitrate}
                  />
                  <SummaryItem
                    icon={<Headphones className="size-3.5" />}
                    label="播放模式"
                    value={PLAY_MODE_LABELS[playMode]}
                  />
                  <SummaryItem
                    icon={<Bell className="size-3.5" />}
                    label="桌面通知"
                    value={notificationsEnabled ? '开启' : '关闭'}
                  />
                </div>
              </section>

              <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <ShieldCheck className="size-4 text-[var(--accent)]" aria-hidden="true" />
                  本地优先
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
                  设置会保存在当前设备，不会改变你的账号资料或云端歌单。
                </p>
              </section>
            </aside>

            <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
              <div className="space-y-4">
                <SettingsSection
                  title="外观"
                  description="选择界面色彩和跟随方式"
                  icon={<Palette className="size-4" />}
                  meta="显示"
                >
                  <SettingsRow
                    label="主题模式"
                    description="跟随系统或手动指定"
                    icon={<Sparkles className="w-4 h-4" />}
                    controlLayout="stacked"
                    control={
                      <SegmentedControl
                        ariaLabel="主题模式"
                        value={theme}
                        onChange={handleThemeChange}
                        options={[
                          { value: 'system', label: '跟随系统', icon: themeIcon('system') },
                          { value: 'light', label: '浅色', icon: themeIcon('light') },
                          { value: 'dark', label: '深色', icon: themeIcon('dark') },
                        ]}
                      />
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="下载"
                  description="离线缓存和本机保存位置"
                  icon={<HardDrive className="size-4" />}
                  meta="存储"
                >
                  <SettingsRow
                    label="下载目录"
                    description="将音乐文件保存到本机"
                    icon={<FolderOpen className="w-4 h-4" />}
                    controlLayout="stacked"
                    control={
                      <input
                        type="text"
                        aria-label="下载目录"
                        data-testid="settings-download-dir"
                        value={downloadDir}
                        onChange={(e) => setDownloadDir(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="快捷键"
                  description="常用键盘控制"
                  icon={<Keyboard className="size-4" />}
                  meta={`${KEYBOARD_SHORTCUTS.length} 项`}
                >
                  <div data-testid="settings-shortcuts" className="grid sm:grid-cols-2">
                    {KEYBOARD_SHORTCUTS.map((sc, index) => (
                      <div
                        key={sc.keys}
                        className={cn(
                          'flex items-center justify-between gap-4 px-4 py-3',
                          index < KEYBOARD_SHORTCUTS.length - 1 && 'border-b border-[var(--border-subtle)]',
                          index % 2 === 0 && 'sm:border-r sm:border-[var(--border-subtle)]',
                          index >= KEYBOARD_SHORTCUTS.length - 2 && 'sm:border-b-0',
                          index === KEYBOARD_SHORTCUTS.length - 1 && 'sm:col-span-2 sm:border-r-0',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Keyboard className="w-4 h-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                          <span className="text-sm text-[var(--text-primary)]">{sc.action}</span>
                        </div>
                        <kbd className="px-2 py-0.5 rounded-md bg-[var(--bg-hover)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
                          {sc.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </SettingsSection>
              </div>

              <div className="space-y-4">
                <SettingsSection
                  title="播放"
                  description="默认播放策略和流媒体质量"
                  icon={<Headphones className="size-4" />}
                  meta="音频"
                >
                  <SettingsRow
                    label="默认播放模式"
                    description="新建播放列表时使用"
                    icon={<Music2 className="w-4 h-4" />}
                    controlLayout="stacked"
                    control={
                      <SegmentedControl
                        ariaLabel="默认播放模式"
                        value={playMode}
                        onChange={handlePlayModeChange}
                        options={[
                          { value: 'sequential', label: PLAY_MODE_LABELS.sequential, icon: <ListOrdered className="size-3.5" /> },
                          { value: 'repeat-all', label: PLAY_MODE_LABELS['repeat-all'], icon: <Repeat className="size-3.5" /> },
                          { value: 'repeat-one', label: PLAY_MODE_LABELS['repeat-one'], icon: <Repeat1 className="size-3.5" /> },
                          { value: 'shuffle', label: PLAY_MODE_LABELS.shuffle, icon: <Shuffle className="size-3.5" /> },
                        ]}
                      />
                    }
                  />
                  <SettingsRow
                    label="优先音质"
                    description="网络与流量受限时将自动降级"
                    icon={<Sparkles className="w-4 h-4" />}
                    control={
                      <select
                        aria-label="优先音质"
                        data-testid="settings-quality"
                        value={quality}
                        onChange={(e) => setQuality(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] sm:w-40"
                      >
                        {QUALITY_OPTIONS.map((q) => (
                          <option
                            key={q.value}
                            value={q.value}
                            className="bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                          >
                            {q.label} · {q.bitrate}
                          </option>
                        ))}
                      </select>
                    }
                  />
                </SettingsSection>

                <SettingsSection
                  title="通知"
                  description="播放状态和系统提醒"
                  icon={<Bell className="size-4" />}
                  meta={notificationsEnabled ? '已开启' : '已关闭'}
                >
                  <SettingsRow
                    label="桌面通知"
                    description="切歌、播放状态变化时通知"
                    icon={<Bell className="w-4 h-4" />}
                    control={
                      <ToggleSwitch
                        id="settings-notifications"
                        ariaLabel="启用桌面通知"
                        checked={notificationsEnabled}
                        onChange={setNotificationsEnabled}
                      />
                    }
                  />
                </SettingsSection>

                {isLoggedIn && (
                  <SettingsSection
                    title="账号与安全"
                    description="管理当前登录会话"
                    icon={<ShieldCheck className="size-4" />}
                    meta="账号"
                  >
                    <SettingsRow
                      label="退出登录"
                      description="清除本地登录状态并通知服务器结束会话"
                      icon={<LogOut className="w-4 h-4" />}
                      control={
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-300"
                        >
                          <LogOut className="size-4" aria-hidden="true" />
                          退出登录
                        </button>
                      }
                    />
                  </SettingsSection>
                )}

                <SettingsSection
                  title="关于"
                  description="版本、协议和服务兼容信息"
                  icon={<Info className="size-4" />}
                  meta="应用"
                >
                  <SettingsRow
                    label="版本号"
                    icon={<Info className="w-4 h-4" />}
                    control={
                      <span className="text-sm text-[var(--text-secondary)] font-mono">v{APP_VERSION}</span>
                    }
                  />
                  <SettingsRow
                    label="开源协议"
                    icon={<Info className="w-4 h-4" />}
                    control={
                      <span className="text-sm text-[var(--text-secondary)] font-mono">{APP_LICENSE}</span>
                    }
                  />
                  <SettingsRow
                    label="后端服务"
                    description="兼容 NeteaseCloudMusicApi"
                    icon={<Download className="w-4 h-4" />}
                    control={
                      <span className="text-sm text-[var(--text-tertiary)]">NCM API</span>
                    }
                  />
                </SettingsSection>
              </div>
            </div>
          </div>

          <footer className="mt-5 text-center text-xs text-[var(--text-quaternary)]">
            Kahi Music · 本地优先的音乐体验
          </footer>
        </div>
      </section>
    </AppShell>
  )
}

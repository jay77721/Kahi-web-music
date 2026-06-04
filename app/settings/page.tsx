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
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsRow } from '@/components/settings/SettingsRow'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { useUIStore } from '@/stores/uiStore'
import { usePlayerStore } from '@/stores/playerStore'
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
  { keys: '→', action: '下一首' },
  { keys: '←', action: '上一首' },
  { keys: '↑', action: '音量 +' },
  { keys: '↓', action: '音量 -' },
  { keys: 'M', action: '静音 / 取消静音' },
  { keys: 'F', action: '全屏播放器' },
]

const APP_VERSION = '0.1.0'
const APP_LICENSE = 'MIT'

/**
 * SegmentedControl — small primitive for choosing one of N options.
 * Pure presentational, controlled.
 */
interface SegmentedControlProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string; icon?: ReactNode }>
  onChange: (next: T) => void
  ariaLabel: string
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]"
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
              'flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium transition-colors',
              selected
                ? 'bg-[var(--accent)] text-black shadow-[0_0_12px_var(--accent-glow)]'
                : 'text-white/60 hover:text-white',
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
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-[var(--accent)]' : 'bg-white/[0.12]',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore()
  const { playMode, setPlayMode } = usePlayerStore()

  const [quality, setQuality] = useState<string>(
    () => storage.get('play:quality', 'exhigh'),
  )
  const [downloadDir, setDownloadDir] = useState<string>(
    () => storage.get('download:dir', '~/Downloads/KahiMusic'),
  )
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => storage.get('notifications:enabled', true),
  )

  useEffect(() => {
    storage.set('play:quality', quality)
  }, [quality])

  useEffect(() => {
    storage.set('download:dir', downloadDir)
  }, [downloadDir])

  useEffect(() => {
    storage.set('notifications:enabled', notificationsEnabled)
  }, [notificationsEnabled])

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

  const themeIcon = (t: Theme) => {
    if (t === 'system') return <Monitor className="w-3.5 h-3.5" />
    if (t === 'light') return <Sun className="w-3.5 h-3.5" />
    return <Moon className="w-3.5 h-3.5" />
  }

  return (
    <AppShell>
      <section
        data-testid="settings-page"
        className="min-h-full p-4 md:p-6 max-w-3xl mx-auto"
      >
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--accent)]/15"
              style={{ boxShadow: '0 0 18px var(--accent-glow)' }}
            >
              <SettingsIcon className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              设置
            </h1>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] ml-14">
            个性化你的 KaQi Music 体验
          </p>
        </header>

        <div className="space-y-8">
          {/* ── Theme ── */}
          <SettingsSection title="外观" description="选择你喜欢的主题外观">
            <SettingsRow
              label="主题模式"
              description="跟随系统或手动指定"
              icon={<Sparkles className="w-4 h-4" />}
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

          {/* ── Playback ── */}
          <SettingsSection title="播放" description="控制默认播放行为">
            <SettingsRow
              label="默认播放模式"
              description="新建播放列表时使用"
              icon={<Music2 className="w-4 h-4" />}
              control={
                <SegmentedControl
                  ariaLabel="默认播放模式"
                  value={playMode}
                  onChange={handlePlayModeChange}
                  options={[
                    { value: 'sequential', label: PLAY_MODE_LABELS.sequential, icon: <ListOrdered className="w-3.5 h-3.5" /> },
                    { value: 'repeat-all', label: PLAY_MODE_LABELS['repeat-all'], icon: <Repeat className="w-3.5 h-3.5" /> },
                    { value: 'repeat-one', label: PLAY_MODE_LABELS['repeat-one'], icon: <Repeat1 className="w-3.5 h-3.5" /> },
                    { value: 'shuffle', label: PLAY_MODE_LABELS.shuffle, icon: <Shuffle className="w-3.5 h-3.5" /> },
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
                  className="h-8 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-white/90 focus:outline-none focus:border-[var(--accent)]"
                >
                  {QUALITY_OPTIONS.map((q) => (
                    <option key={q.value} value={q.value} className="bg-[#0a0a0a]">
                      {q.label} · {q.bitrate}
                    </option>
                  ))}
                </select>
              }
            />
          </SettingsSection>

          {/* ── Download ── */}
          <SettingsSection title="下载" description="管理离线缓存与下载位置">
            <SettingsRow
              label="下载目录"
              description="将音乐文件保存到本机"
              icon={<FolderOpen className="w-4 h-4" />}
              control={
                <input
                  type="text"
                  aria-label="下载目录"
                  data-testid="settings-download-dir"
                  value={downloadDir}
                  onChange={(e) => setDownloadDir(e.target.value)}
                  className="w-56 h-8 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-white/90 focus:outline-none focus:border-[var(--accent)]"
                />
              }
            />
          </SettingsSection>

          {/* ── Notifications ── */}
          <SettingsSection title="通知" description="系统通知与提醒">
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

          {/* ── Shortcuts ── */}
          <SettingsSection title="快捷键" description="全局键盘快捷键列表">
            <div data-testid="settings-shortcuts" className="divide-y divide-white/[0.04]">
              {KEYBOARD_SHORTCUTS.map((sc) => (
                <div
                  key={sc.keys}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Keyboard className="w-4 h-4 text-white/40" aria-hidden="true" />
                    <span className="text-sm text-white/90">{sc.action}</span>
                  </div>
                  <kbd className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-white/80">
                    {sc.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* ── About ── */}
          <SettingsSection title="关于" description="版本与开源信息">
            <SettingsRow
              label="版本号"
              icon={<Info className="w-4 h-4" />}
              control={
                <span className="text-sm text-white/60 font-mono">v{APP_VERSION}</span>
              }
            />
            <SettingsRow
              label="开源协议"
              icon={<Info className="w-4 h-4" />}
              control={
                <span className="text-sm text-white/60 font-mono">{APP_LICENSE}</span>
              }
            />
            <SettingsRow
              label="后端服务"
              description="兼容 NeteaseCloudMusicApi"
              icon={<Download className="w-4 h-4" />}
              control={
                <span className="text-sm text-white/40">NCM API</span>
              }
            />
          </SettingsSection>
        </div>

        <footer className="mt-12 text-center text-xs text-white/30">
          Made with love — KaQi Music
        </footer>
      </section>
    </AppShell>
  )
}

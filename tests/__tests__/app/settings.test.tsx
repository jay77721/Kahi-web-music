'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import type { PlayMode } from '@/types/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseUIStore = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseUserStore = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

let uiState: Record<string, unknown> = {}
let playerState: Record<string, unknown> = {}
let userState: Record<string, unknown> = {}

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  }
})

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseUIStore(selector) : mockUseUIStore(),
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUsePlayerStore(selector) : mockUsePlayerStore(),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseUserStore(selector) : mockUseUserStore(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/settings/SettingsRow', () => ({
  SettingsRow: ({
    label,
    control,
  }: {
    label: string
    control: React.ReactNode
    'data-testid'?: string
  }) =>
    React.createElement(
      'div',
      { 'data-testid': `row-${label}` },
      React.createElement('span', null, label),
      React.createElement('div', { 'data-testid': `control-${label}` }, control),
    ),
}))

vi.mock('@/components/settings/SettingsSection', () => ({
  SettingsSection: ({
    title,
    children,
  }: {
    title: string
    children: React.ReactNode
  }) =>
    React.createElement(
      'section',
      { 'data-testid': `section-${title}` },
      React.createElement('h2', null, title),
      children,
    ),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUiState(overrides: Partial<{ theme: 'dark' | 'light' | 'system'; setTheme: () => void }> = {}) {
  return {
    theme: 'dark' as 'dark' | 'light' | 'system',
    setTheme: vi.fn(),
    ...overrides,
  }
}

function makePlayerState(overrides: Partial<{ playMode: PlayMode; setPlayMode: () => void }> = {}) {
  return {
    playMode: 'sequential' as PlayMode,
    setPlayMode: vi.fn(),
    ...overrides,
  }
}

function makeUserState(overrides: Partial<{ isLoggedIn: boolean; logout: () => Promise<void> }> = {}) {
  return {
    isLoggedIn: false,
    logout: vi.fn(),
    ...overrides,
  }
}

function setupStores(
  uiOverrides: Parameters<typeof makeUiState>[0] = {},
  playerOverrides: Parameters<typeof makePlayerState>[0] = {},
  userOverrides: Parameters<typeof makeUserState>[0] = {},
) {
  uiState = makeUiState(uiOverrides)
  playerState = makePlayerState(playerOverrides)
  userState = makeUserState(userOverrides)
  mockUseUIStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(uiState) : uiState,
  )
  mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(playerState) : playerState,
  )
  mockUseUserStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(userState) : userState,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockUseUIStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseUserStore.mockReset()
    setupStores()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders inside AppShell and shows the page header', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('settings-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument()
    expect(screen.getByText('个性化你的 Kahi Music 体验')).toBeInTheDocument()
  })

  test('renders all expected sections (skeleton of full page)', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    expect(screen.getByTestId('section-外观')).toBeInTheDocument()
    expect(screen.getByTestId('section-播放')).toBeInTheDocument()
    expect(screen.getByTestId('section-下载')).toBeInTheDocument()
    expect(screen.getByTestId('section-通知')).toBeInTheDocument()
    expect(screen.getByTestId('section-快捷键')).toBeInTheDocument()
    expect(screen.getByTestId('section-关于')).toBeInTheDocument()
  })

  test('shows the keyboard shortcut list', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    const shortcuts = screen.getByTestId('settings-shortcuts')
    expect(shortcuts).toBeInTheDocument()
    expect(screen.getByText('播放 / 暂停')).toBeInTheDocument()
    expect(screen.getByText('下一首')).toBeInTheDocument()
    expect(screen.getByText('全屏播放器')).toBeInTheDocument()
  })

  test('theme segmented control: clicking light calls setTheme("light")', async () => {
    const setTheme = vi.fn()
    setupStores({ theme: 'dark', setTheme })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    const lightBtn = screen.getByTestId('segment-light')
    expect(lightBtn).toBeInTheDocument()
    expect(lightBtn).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(lightBtn)
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  test('theme segmented control: clicking system calls setTheme("system")', async () => {
    const setTheme = vi.fn()
    setupStores({ theme: 'dark', setTheme })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    const systemBtn = screen.getByTestId('segment-system')
    fireEvent.click(systemBtn)
    expect(setTheme).toHaveBeenCalledWith('system')
  })

  test('reflects the current theme in the segmented control checked state', async () => {
    setupStores({ theme: 'light' })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    expect(screen.getByTestId('segment-light')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('segment-dark')).toHaveAttribute('aria-checked', 'false')
  })

  test('play mode switch: clicking repeat-one calls setPlayMode("repeat-one")', async () => {
    const setPlayMode = vi.fn()
    setupStores({}, { playMode: 'sequential', setPlayMode })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    const repeatOne = screen.getByTestId('segment-repeat-one')
    expect(repeatOne).toBeInTheDocument()
    fireEvent.click(repeatOne)
    expect(setPlayMode).toHaveBeenCalledWith('repeat-one')
  })

  test('play mode switch: clicking shuffle calls setPlayMode("shuffle")', async () => {
    const setPlayMode = vi.fn()
    setupStores({}, { playMode: 'sequential', setPlayMode })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    const shuffle = screen.getByTestId('segment-shuffle')
    fireEvent.click(shuffle)
    expect(setPlayMode).toHaveBeenCalledWith('shuffle')
  })

  test('restores persisted local settings after mount', async () => {
    window.localStorage.setItem('kahi-web-music:play:quality', JSON.stringify('hires'))
    window.localStorage.setItem('kahi-web-music:download:dir', JSON.stringify('D:/Music'))
    window.localStorage.setItem('kahi-web-music:notifications:enabled', JSON.stringify(false))

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-quality')).toHaveValue('hires')
    })
    expect(screen.getByTestId('settings-download-dir')).toHaveValue('D:/Music')
    expect(screen.getByTestId('toggle-启用桌面通知')).toHaveAttribute('aria-checked', 'false')
    expect(window.localStorage.getItem('kahi-web-music:play:quality')).toBe(JSON.stringify('hires'))
  })

  test('reflects the current play mode in the segmented control checked state', async () => {
    setupStores({}, { playMode: 'shuffle' })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    expect(screen.getByTestId('segment-shuffle')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('segment-sequential')).toHaveAttribute('aria-checked', 'false')
  })

  test('falls back when persisted local settings are invalid', async () => {
    window.localStorage.setItem('kahi-web-music:play:quality', JSON.stringify('ultra'))
    window.localStorage.setItem('kahi-web-music:download:dir', JSON.stringify(42))
    window.localStorage.setItem('kahi-web-music:notifications:enabled', JSON.stringify('yes'))

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('settings-quality')).toHaveValue('exhigh')
    })
    expect(screen.getByTestId('settings-download-dir')).toHaveValue('~/Downloads/KahiMusic')
    expect(screen.getByTestId('toggle-启用桌面通知')).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => {
      expect(window.localStorage.getItem('kahi-web-music:play:quality')).toBe(JSON.stringify('exhigh'))
    })
  })

  test('shows logout action for logged-in users and reports success', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    setupStores({}, {}, { isLoggedIn: true, logout })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: /退出登录/ }))

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(mockToastSuccess).toHaveBeenCalledWith('已退出登录')
    expect(mockToastError).not.toHaveBeenCalled()
  })

  test('shows logout failure toast when server logout fails', async () => {
    const logout = vi.fn().mockRejectedValue(new Error('服务器退出失败'))
    setupStores({}, {}, { isLoggedIn: true, logout })

    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: /退出登录/ }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('服务器退出失败'))
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  test('renders version + license in the about section', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    render(<SettingsPage />)

    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument()
    expect(screen.getByText('MIT')).toBeInTheDocument()
  })
})

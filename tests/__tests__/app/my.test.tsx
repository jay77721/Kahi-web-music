'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import React from 'react'
import type { UserProfile } from '@/types/user'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockUseUserStore = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseHistoryStore = vi.fn()
const mockUseSearchParams = vi.fn()
const mockUseDominantColor = vi.fn()

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, back: vi.fn() }),
    useSearchParams: () => mockUseSearchParams(),
  }
})

vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: (...args: unknown[]) => mockUseDominantColor(...args),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseUserStore(selector) : (mockUseUserStore() ?? makeUserStore()),
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUsePlayerStore(selector) : (mockUsePlayerStore() ?? makePlayerStore()),
}))

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseHistoryStore(selector) : (mockUseHistoryStore() ?? makeHistoryStore()),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    likelist: vi.fn(),
    songDetail: vi.fn(),
    recordRecentSong: vi.fn(),
    userPlaylist: vi.fn(),
    userCloud: vi.fn(),
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/common/SongTable', () => ({
  SongTable: () => React.createElement('div', { 'data-testid': 'song-table' }),
}))

vi.mock('@/components/common/PlaylistCard', () => ({
  PlaylistCard: () => React.createElement('div', { 'data-testid': 'playlist-card' }),
}))

vi.mock('@/components/player/PlayerBar', () => ({
  PlayerBar: () => null,
}))
vi.mock('@/components/player/PlayerOverlays', () => ({
  PlayerOverlays: () => null,
}))
vi.mock('@/components/player/MiniPlayer', () => ({
  MiniPlayer: () => null,
}))
vi.mock('@/components/player/FullScreenPlayer', () => ({
  FullScreenPlayer: () => null,
}))
vi.mock('@/components/player/PlayQueue', () => ({
  PlayQueue: () => null,
}))

// Mock the user/ProfileHeader to make the test more focused.
vi.mock('@/components/user/ProfileHeader', () => ({
  ProfileHeader: ({ user }: { user: UserProfile }) =>
    React.createElement(
      'div',
      { 'data-testid': 'profile-header' },
      user.nickname
    ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_PROFILE: UserProfile = {
  userId: 1001,
  nickname: 'Kahi Tester',
  avatarUrl: 'https://example.com/avatar.jpg',
  signature: 'Living for music',
  level: 9,
  vipType: 0,
  follows: 12,
  followeds: 345,
  listenSongs: 12345,
}

function makeUserStore(
  overrides: Partial<{
    isLoggedIn: boolean
    profile: UserProfile | null
    hasRestoredSession: boolean
  }> = {}
) {
  return {
    isLoggedIn: true,
    profile: FAKE_PROFILE,
    hasRestoredSession: true,
    ...overrides,
  }
}

function makePlayerStore() {
  return { playQueue: vi.fn() }
}

function makeHistoryStore() {
  return { history: [], clear: vi.fn() }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MyPage', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseHistoryStore.mockReset()
    mockUseSearchParams.mockReset()
    mockUseDominantColor.mockReset()

    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockUseUserStore.mockImplementation((selector) =>
      selector ? selector(makeUserStore() as unknown as Record<string, unknown>) : makeUserStore()
    )
    mockUsePlayerStore.mockImplementation((selector) =>
      selector ? selector(makePlayerStore() as unknown as Record<string, unknown>) : makePlayerStore()
    )
    mockUseHistoryStore.mockImplementation((selector) =>
      selector ? selector(makeHistoryStore() as unknown as Record<string, unknown>) : makeHistoryStore()
    )
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('redirects to /login without placeholder after session restoration', async () => {
    mockUseUserStore.mockImplementation((selector) =>
      selector
        ? selector(
            makeUserStore({
              isLoggedIn: false,
              profile: null,
              hasRestoredSession: true,
            }) as unknown as Record<string, unknown>
          )
        : makeUserStore({
            isLoggedIn: false,
            profile: null,
            hasRestoredSession: true,
          })
    )

    const { default: MyPage } = await import('@/app/my/page')
    render(<MyPage />)

    // Wait for the useEffect to fire (router.replace is sync after mount).
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.queryByTestId('my-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('my-page-placeholder')).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading profile' })).not.toBeInTheDocument()
  })

  test('shows placeholder while session restoration is pending', async () => {
    mockUseUserStore.mockImplementation((selector) =>
      selector
        ? selector(
            makeUserStore({
              isLoggedIn: false,
              profile: null,
              hasRestoredSession: false,
            }) as unknown as Record<string, unknown>
          )
        : makeUserStore({
            isLoggedIn: false,
            profile: null,
            hasRestoredSession: false,
          })
    )

    const { default: MyPage } = await import('@/app/my/page')
    render(<MyPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(screen.queryByTestId('my-page')).not.toBeInTheDocument()
    const placeholder = screen.getByTestId('my-page-placeholder')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).toHaveClass('min-h-full')
    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument()
  })

  test('renders profile header and tabs skeleton when logged in', async () => {
    const { default: MyPage } = await import('@/app/my/page')
    render(<MyPage />)

    // The page shell + profile header are rendered for a logged-in user.
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('my-page')).toHaveClass('min-h-full')
    expect(screen.getByTestId('profile-header')).toBeInTheDocument()
    expect(screen.getByText('Kahi Tester')).toBeInTheDocument()

    // Tab triggers are present.
    expect(screen.getByRole('tab', { name: /喜欢/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /最近/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /歌单/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /云盘/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /本地历史/ })).toBeInTheDocument()
  })

  test('does not redirect when user is logged in', async () => {
    const { default: MyPage } = await import('@/app/my/page')
    render(<MyPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  test('tolerates missing profile counts (0 defaults)', async () => {
    mockUseUserStore.mockImplementation((selector) =>
      selector
        ? selector(
            makeUserStore({
              profile: { ...FAKE_PROFILE, follows: undefined, followeds: undefined, listenSongs: undefined },
            }) as unknown as Record<string, unknown>
          )
        : makeUserStore({
            profile: { ...FAKE_PROFILE, follows: undefined, followeds: undefined, listenSongs: undefined },
          })
    )

    const { default: MyPage } = await import('@/app/my/page')
    render(<MyPage />)

    // The page still renders without throwing.
    expect(screen.getByTestId('my-page')).toBeInTheDocument()
    expect(screen.getByTestId('profile-header')).toBeInTheDocument()
  })
})

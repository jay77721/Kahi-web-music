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
const mockUseDominantColor = vi.fn()
const mockUseSWR = vi.fn()
const mockMutate = vi.fn()

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, back: vi.fn() }),
  }
})

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

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

vi.mock('@/lib/api', () => ({
  ncmApi: {
    likelist: vi.fn(),
    songDetail: vi.fn(),
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/common/SongTable', () => ({
  SongTable: ({ songs }: { songs: { id: number; name: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'song-table' },
      `songs:${songs.length}`
    ),
}))

vi.mock('@/components/player/PlayerBar', () => ({ PlayerBar: () => null }))
vi.mock('@/components/player/MiniPlayer', () => ({ MiniPlayer: () => null }))
vi.mock('@/components/player/FullScreenPlayer', () => ({ FullScreenPlayer: () => null }))
vi.mock('@/components/player/PlayQueue', () => ({ PlayQueue: () => null }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_PROFILE: UserProfile = {
  userId: 4242,
  nickname: 'Liked Tester',
  avatarUrl: 'https://example.com/avatar.jpg',
  signature: 'Likes',
  level: 5,
  vipType: 0,
  follows: 4,
  followeds: 9,
  listenSongs: 1024,
}

function makeUserStore(
  overrides: Partial<{
    isLoggedIn: boolean
    profile: UserProfile | null
    hasRestoredSession: boolean
  }> = {}
) {
  return { isLoggedIn: true, profile: FAKE_PROFILE, hasRestoredSession: true, ...overrides }
}

function makePlayerStore() {
  return { playQueue: vi.fn(), setPlayMode: vi.fn() }
}

function makeSongList() {
  return [
    {
      id: 11,
      name: 'Fav Song 1',
      ar: [{ id: 1, name: 'Artist A' }],
      al: { id: 1, name: 'Album A', picUrl: 'https://example.com/a.jpg' },
      dt: 195000,
    },
    {
      id: 22,
      name: 'Fav Song 2',
      ar: [{ id: 2, name: 'Artist B' }],
      al: { id: 2, name: 'Album B', picUrl: 'https://example.com/b.jpg' },
      dt: 220000,
    },
  ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LikedPage', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseDominantColor.mockReset()
    mockUseSWR.mockReset()
    mockMutate.mockReset()

    mockUseUserStore.mockImplementation((selector) =>
      selector
        ? selector(makeUserStore() as unknown as Record<string, unknown>)
        : makeUserStore()
    )
    mockUsePlayerStore.mockImplementation((selector) =>
      selector
        ? selector(makePlayerStore() as unknown as Record<string, unknown>)
        : makePlayerStore()
    )
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('redirects to /login when user is not logged in', async () => {
    mockUseUserStore.mockImplementation((selector) =>
      selector
        ? selector(
            makeUserStore({ isLoggedIn: false, profile: null }) as unknown as Record<string, unknown>
          )
        : makeUserStore({ isLoggedIn: false, profile: null })
    )

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.queryByTestId('liked-page')).not.toBeInTheDocument()
  })

  test('renders skeleton while loading', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('liked-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '我喜欢的音乐' })).toBeInTheDocument()
    expect(screen.getByText('你收藏的所有歌曲')).toBeInTheDocument()
    expect(screen.getByTestId('liked-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('liked-error')).not.toBeInTheDocument()
    expect(screen.queryByTestId('liked-empty')).not.toBeInTheDocument()
  })

  test('renders error state with retry button', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    expect(screen.getByTestId('liked-error')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('liked-loading')).not.toBeInTheDocument()
  })

  test('renders empty state when there are no songs', async () => {
    mockUseSWR.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    expect(screen.getByTestId('liked-empty')).toBeInTheDocument()
    expect(screen.getByText('还没有收藏的歌曲')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('liked-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('liked-error')).not.toBeInTheDocument()
  })

  test('renders song table and action buttons when songs are loaded', async () => {
    mockUseSWR.mockReturnValue({
      data: makeSongList(),
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    expect(screen.getByTestId('song-table')).toBeInTheDocument()
    expect(screen.getByTestId('song-table').textContent).toBe('songs:2')
    expect(screen.getByTestId('liked-play-all')).toBeInTheDocument()
    expect(screen.getByTestId('liked-shuffle')).toBeInTheDocument()
    expect(screen.getByText(/共 2 首/)).toBeInTheDocument()
    expect(screen.queryByTestId('liked-empty')).not.toBeInTheDocument()
  })
})

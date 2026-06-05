'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
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
    userCloud: vi.fn(),
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
  userId: 2002,
  nickname: 'Cloud Tester',
  avatarUrl: 'https://example.com/avatar.jpg',
  signature: 'Cloud collector',
  level: 7,
  vipType: 0,
  follows: 8,
  followeds: 21,
  listenSongs: 6789,
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
  return { playQueue: vi.fn() }
}

function makeSongList() {
  return [
    {
      id: 1,
      name: 'Cloud Song 1',
      ar: [{ id: 1, name: 'Artist A' }],
      al: { id: 1, name: 'Album A', picUrl: 'https://example.com/a.jpg' },
      dt: 200000,
    },
    {
      id: 2,
      name: 'Cloud Song 2',
      ar: [{ id: 2, name: 'Artist B' }],
      al: { id: 2, name: 'Album B', picUrl: 'https://example.com/b.jpg' },
      dt: 250000,
    },
  ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CloudPage', () => {
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

    const { default: CloudPage } = await import('@/app/cloud/page')
    render(<CloudPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.queryByTestId('cloud-page')).not.toBeInTheDocument()
  })

  test('renders skeleton while loading', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: CloudPage } = await import('@/app/cloud/page')
    render(<CloudPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('cloud-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '云盘' })).toBeInTheDocument()
    expect(screen.getByText('在这里管理你上传的音乐')).toBeInTheDocument()
    expect(screen.getByTestId('cloud-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cloud-error')).not.toBeInTheDocument()
  })

  test('renders error state with retry button', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      mutate: mockMutate,
    })

    const { default: CloudPage } = await import('@/app/cloud/page')
    render(<CloudPage />)

    expect(screen.getByTestId('cloud-error')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
  })

  test('retry button triggers mutate', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Boom'),
      mutate: mockMutate,
    })

    const { default: CloudPage } = await import('@/app/cloud/page')
    render(<CloudPage />)

    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  test('renders empty state when there are no songs', async () => {
    mockUseSWR.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: CloudPage } = await import('@/app/cloud/page')
    render(<CloudPage />)

    expect(screen.getByTestId('cloud-empty')).toBeInTheDocument()
    expect(screen.getByText('云盘空空如也')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
  })

  test('renders song table when songs are loaded', async () => {
    mockUseSWR.mockReturnValue({
      data: makeSongList(),
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: CloudPage } = await import('@/app/cloud/page')
    render(<CloudPage />)

    expect(screen.getByTestId('song-table')).toBeInTheDocument()
    expect(screen.getByTestId('song-table').textContent).toBe('songs:2')
    expect(screen.getByText(/共 2 首/)).toBeInTheDocument()
  })
})

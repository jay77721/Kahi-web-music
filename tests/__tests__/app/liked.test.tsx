'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent, waitFor, within } from '@testing-library/react'
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
const mockRestoreSession = vi.fn()
const mockNcmApi = vi.hoisted(() => ({
  likelist: vi.fn(),
  songDetail: vi.fn(),
}))

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
    likelist: mockNcmApi.likelist,
    songDetail: mockNcmApi.songDetail,
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
    restore: () => void
  }> = {}
) {
  return {
    isLoggedIn: true,
    profile: FAKE_PROFILE,
    hasRestoredSession: true,
    restore: mockRestoreSession,
    ...overrides,
  }
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

function makeSong(id: number) {
  return {
    id,
    name: `Fav Song ${id}`,
    ar: [{ id, name: `Artist ${id}` }],
    al: { id, name: `Album ${id}`, picUrl: `https://example.com/${id}.jpg` },
    dt: 195000,
  }
}

function makeIds(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1)
}

function usePlayerStoreFixture() {
  const playerStore = makePlayerStore()
  mockUsePlayerStore.mockImplementation((selector) =>
    selector
      ? selector(playerStore as unknown as Record<string, unknown>)
      : playerStore
  )
  return playerStore
}

function expectFullQueue(playerStore: ReturnType<typeof makePlayerStore>) {
  expect(playerStore.playQueue).toHaveBeenCalledTimes(1)
  const [queue, startIndex] = playerStore.playQueue.mock.calls[0] as [
    ReturnType<typeof makeSong>[],
    number,
  ]
  expect(queue).toHaveLength(60)
  expect(startIndex).toBe(0)
  return queue
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
    mockRestoreSession.mockReset()
    mockNcmApi.likelist.mockReset()
    mockNcmApi.songDetail.mockReset()

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
    mockNcmApi.songDetail.mockImplementation(async (ids: string) => ({
      songs: ids.split(',').filter(Boolean).map((id) => makeSong(Number(id))),
    }))
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

  test('renders the session restore skeleton before redirecting or fetching liked songs', async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const restoringStore = makeUserStore({
        isLoggedIn: false,
        profile: null,
        hasRestoredSession: false,
      })

      return selector
        ? selector(restoringStore as unknown as Record<string, unknown>)
        : restoringStore
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('liked-session-loading')).toBeInTheDocument()
    expect(mockRestoreSession).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expect(mockUseSWR.mock.calls[0]?.[0]).toBeNull()
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
      data: makeSongList().map((song) => song.id),
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('song-table').textContent).toBe('songs:2')
    })
    expect(screen.getByTestId('liked-play-all')).toBeInTheDocument()
    expect(screen.getByTestId('liked-shuffle')).toBeInTheDocument()
    expect(screen.getByText(/共 2 首/)).toBeInTheDocument()
    expect(screen.queryByTestId('liked-empty')).not.toBeInTheDocument()
  })

  test('loads liked song details one page at a time', async () => {
    mockUseSWR.mockReturnValue({
      data: makeIds(60),
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('song-table').textContent).toBe('songs:50')
    })

    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(1)
    expect(mockNcmApi.songDetail).toHaveBeenLastCalledWith(makeIds(50).join(','))

    fireEvent.click(screen.getByTestId('liked-load-more'))

    await waitFor(() => {
      expect(screen.getByTestId('song-table').textContent).toBe('songs:60')
    })

    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(2)
    expect(mockNcmApi.songDetail).toHaveBeenLastCalledWith(makeIds(60).slice(50).join(','))
    expect(screen.queryByTestId('liked-load-more')).not.toBeInTheDocument()
  })

  test('liked-play-all fetches remaining liked songs before playing the full queue', async () => {
    const playerStore = usePlayerStoreFixture()
    const ids = makeIds(60)
    mockUseSWR.mockReturnValue({
      data: ids,
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('song-table').textContent).toBe('songs:50')
    })
    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('liked-play-all'))

    await waitFor(() => {
      expect(playerStore.playQueue).toHaveBeenCalledTimes(1)
    })

    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(2)
    expect(mockNcmApi.songDetail).toHaveBeenNthCalledWith(2, ids.slice(50).join(','))
    expect(mockNcmApi.songDetail.mock.invocationCallOrder[1]).toBeLessThan(
      playerStore.setPlayMode.mock.invocationCallOrder[0]
    )
    expect(playerStore.setPlayMode).toHaveBeenCalledWith('sequential')
    expect(playerStore.setPlayMode.mock.invocationCallOrder[0]).toBeLessThan(
      playerStore.playQueue.mock.invocationCallOrder[0]
    )
    const queue = expectFullQueue(playerStore)
    expect(queue.map((song) => song.id)).toEqual(ids)
  })

  test('liked-shuffle fetches remaining liked songs before shuffling the full queue', async () => {
    const playerStore = usePlayerStoreFixture()
    const ids = makeIds(60)
    mockUseSWR.mockReturnValue({
      data: ids,
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('song-table').textContent).toBe('songs:50')
    })
    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('liked-shuffle'))

    await waitFor(() => {
      expect(playerStore.playQueue).toHaveBeenCalledTimes(1)
    })

    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(2)
    expect(mockNcmApi.songDetail).toHaveBeenNthCalledWith(2, ids.slice(50).join(','))
    expect(mockNcmApi.songDetail.mock.invocationCallOrder[1]).toBeLessThan(
      playerStore.setPlayMode.mock.invocationCallOrder[0]
    )
    expect(playerStore.setPlayMode).toHaveBeenCalledWith('shuffle')
    expect(playerStore.setPlayMode.mock.invocationCallOrder[0]).toBeLessThan(
      playerStore.playQueue.mock.invocationCallOrder[0]
    )
    const queue = expectFullQueue(playerStore)
    expect(queue.map((song) => song.id).sort((a, b) => a - b)).toEqual(ids)
  })

  test('retries song detail failure and renders songs after retry succeeds', async () => {
    mockUseSWR.mockReturnValue({
      data: [11, 22],
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })
    mockNcmApi.songDetail
      .mockRejectedValueOnce(new Error('Detail exploded'))
      .mockImplementation(async (ids: string) => ({
        songs: ids.split(',').filter(Boolean).map((id) => makeSong(Number(id))),
      }))

    const { default: LikedPage } = await import('@/app/liked/page')
    render(<LikedPage />)

    await waitFor(() => {
      expect(screen.getByTestId('liked-error')).toBeInTheDocument()
    })
    expect(screen.getByText('Detail exploded')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()

    fireEvent.click(within(screen.getByTestId('liked-error')).getByRole('button'))

    await waitFor(() => {
      expect(screen.getByTestId('song-table').textContent).toBe('songs:2')
    })

    expect(mockNcmApi.songDetail).toHaveBeenCalledTimes(2)
    expect(mockNcmApi.songDetail).toHaveBeenLastCalledWith('11,22')
    expect(screen.queryByTestId('liked-error')).not.toBeInTheDocument()
  })
})

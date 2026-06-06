'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseSWR = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseSearchParams = vi.fn()

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
  }
})

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUsePlayerStore(selector) : mockUsePlayerStore(),
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/common/SongTable', () => ({
  SongTable: ({
    songs,
    animated,
    showArtwork,
    showActions,
  }: {
    songs: { id: number }[]
    animated?: boolean
    showArtwork?: boolean
    showActions?: boolean
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'song-table',
        'data-animated': String(animated),
        'data-show-artwork': String(showArtwork),
        'data-show-actions': String(showActions),
      },
      `${songs.length} songs`
    ),
}))

vi.mock('@/components/leaderboard/LeaderboardTabs', () => ({
  LeaderboardTabs: ({ items, activeId, onChange }: {
    items: { id: number; label: string }[]
    activeId: number | null
    onChange: (id: number) => void
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'leaderboard-tabs' },
      items.map((item) =>
        React.createElement(
          'button',
          {
            key: item.id,
            type: 'button',
            onClick: () => onChange(item.id),
            'data-tab-id': String(item.id),
            'data-active': String(item.id === activeId),
          },
          item.label
        )
      )
    ),
}))

vi.mock('@/components/player/PlayerBar', () => ({
  PlayerBar: () => null,
}))
vi.mock('@/components/player/PlayerOverlays', () => ({
  PlayerOverlays: () => null,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayerStore() {
  return { playQueue: vi.fn() }
}

function swrState<T>(overrides: Partial<{ data: T; isLoading: boolean; error: unknown }> = {}) {
  return {
    data: undefined as T | undefined,
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    ...overrides,
  }
}

function makeTracks(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Song ${index + 1}`,
  }))
}

beforeEach(() => {
  mockUseSWR.mockReset()
  mockUsePlayerStore.mockReset()
  mockUseSearchParams.mockReset()
  mockUseSearchParams.mockReturnValue(new URLSearchParams())
  mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(makePlayerStore() as unknown as Record<string, unknown>) : makePlayerStore()
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeaderboardPage', () => {
  test('renders the page header and shell', async () => {
    mockUseSWR.mockImplementation((key: unknown) => {
      if (key === 'toplist') return swrState({ isLoading: true })
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '排行榜' })).toBeInTheDocument()
    expect(screen.getByText('Charts')).toBeInTheDocument()
  })

  test('renders four lightweight chart cards without cover images', async () => {
    mockUseSWR.mockImplementation((key: unknown) => {
      if (key === 'toplist') {
        return swrState({
          data: [
            { id: 3779629, name: '新歌榜', coverImgUrl: 'https://x/1.jpg' },
            { id: 2884035, name: '热歌榜', coverImgUrl: 'https://x/2.jpg' },
            { id: 19723756, name: '飙升榜', coverImgUrl: 'https://x/3.jpg' },
            { id: 60131, name: '原创榜', coverImgUrl: 'https://x/4.jpg' },
          ],
        })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    expect(screen.getByTestId('chart-card-3779629')).toBeInTheDocument()
    expect(screen.getByTestId('chart-card-2884035')).toBeInTheDocument()
    expect(screen.getByTestId('chart-card-19723756')).toBeInTheDocument()
    expect(screen.getByTestId('chart-card-60131')).toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  test('keeps default detail idle until a chart is selected', async () => {
    const mockPlayQueue = vi.fn()
    mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector
        ? selector({ playQueue: mockPlayQueue } as unknown as Record<string, unknown>)
        : { playQueue: mockPlayQueue }
    )

    mockUseSWR.mockImplementation((key: unknown) => {
      if (key === 'toplist') {
        return swrState({
          data: [{ id: 3779629, name: '新歌榜', coverImgUrl: 'https://x/1.jpg' }],
        })
      }
      if (Array.isArray(key) && key[0] === 'leaderboard-detail' && key[1] === 3779629) {
        return swrState({
          data: {
            name: '新歌榜',
            coverImgUrl: 'https://x/1.jpg',
            tracks: makeTracks(60) as never,
          },
        })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    expect(
      mockUseSWR.mock.calls.some(
        ([key]) => Array.isArray(key) && key[0] === 'leaderboard-detail'
      )
    ).toBe(false)
    expect(mockUseSWR.mock.calls.some(([key]) => key === null)).toBe(true)
    expect(screen.getByTestId('leaderboard-empty')).toHaveTextContent('先选择一个榜单')
    expect(screen.getByTestId('leaderboard-empty')).toHaveTextContent('歌曲详情会在这里展开')
    expect(screen.getByTestId('leaderboard-empty-cta-3779629')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('leaderboard-empty-cta-3779629'))

    await waitFor(
      () => {
        expect(screen.getByTestId('leaderboard-detail')).toBeInTheDocument()
      },
      { timeout: 5_000 }
    )
    expect(screen.getByTestId('song-table')).toHaveTextContent('12 songs')
    expect(
      mockUseSWR.mock.calls.some(
        ([key]) => Array.isArray(key) && key[0] === 'leaderboard-detail' && key[1] === 3779629
      )
    ).toBe(true)
  })

  test('opens the chart id from the query string and requests detail immediately', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('id=19723756'))

    mockUseSWR.mockImplementation((key: unknown) => {
      if (key === 'toplist') {
        return swrState({
          data: [
            { id: 3779629, name: '新歌榜', coverImgUrl: 'https://x/1.jpg' },
            { id: 19723756, name: '飙升榜', coverImgUrl: 'https://x/2.jpg' },
          ],
        })
      }
      if (Array.isArray(key) && key[0] === 'leaderboard-detail' && key[1] === 19723756) {
        return swrState({
          data: {
            name: '飙升榜',
            coverImgUrl: 'https://x/2.jpg',
            tracks: [{ id: 3, name: 'Song C' }] as never,
          },
        })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    expect(screen.getByTestId('chart-card-19723756')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('chart-card-3779629')).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => {
      expect(screen.getByTestId('song-table')).toHaveTextContent('1 songs')
    })
    expect(
      mockUseSWR.mock.calls.some(
        ([key]) => Array.isArray(key) && key[0] === 'leaderboard-detail' && key[1] === 19723756
      )
    ).toBe(true)
  })

  test('shows loading skeleton when detail is loading', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('id=1'))

    mockUseSWR.mockImplementation((key: unknown) => {
      if (key === 'toplist') {
        return swrState({
          data: [{ id: 1, name: 'X', coverImgUrl: '' }],
        })
      }
      if (Array.isArray(key) && key[0] === 'leaderboard-detail') {
        return swrState({ isLoading: true })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument()
  })

  test('renders a lighter requested leaderboard and expands to the top 50 on demand', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('id=3779629'))

    mockUseSWR.mockImplementation((key: unknown) => {
      if (key === 'toplist') {
        return swrState({
          data: [{ id: 3779629, name: '新歌榜', coverImgUrl: 'https://x/1.jpg' }],
        })
      }
      if (Array.isArray(key) && key[0] === 'leaderboard-detail' && key[1] === 3779629) {
        return swrState({
          data: {
            name: '新歌榜',
            coverImgUrl: 'https://x/1.jpg',
            tracks: makeTracks(60) as never,
          },
        })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('song-table')).toHaveTextContent('12 songs')
    })
    expect(screen.getByTestId('song-table')).toHaveAttribute('data-animated', 'false')
    expect(screen.getByTestId('song-table')).toHaveAttribute('data-show-artwork', 'false')
    expect(screen.getByTestId('song-table')).toHaveAttribute('data-show-actions', 'false')
    expect(screen.getByText('已显示 12/50 首 · 共 60 首')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('leaderboard-load-full'))

    expect(screen.getByTestId('song-table')).toHaveTextContent('50 songs')
    expect(screen.getByText('已显示 50/50 首 · 共 60 首')).toBeInTheDocument()
    expect(screen.queryByTestId('leaderboard-load-full')).not.toBeInTheDocument()
  })
})

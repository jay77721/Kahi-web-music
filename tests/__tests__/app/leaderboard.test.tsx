'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
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
  SongTable: ({ songs }: { songs: { id: number }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'song-table' },
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

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, ...rest } = props
    return React.createElement('img', { alt: (alt as string) ?? '', ...rest })
  },
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
    // First SWR call: toplist (loading). Second: detail (idle).
    mockUseSWR.mockImplementation((key: string | null) => {
      if (key === 'toplist') return swrState({ isLoading: true })
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '排行榜' })).toBeInTheDocument()
    expect(screen.getByText('Charts')).toBeInTheDocument()
  })

  test('renders four chart cards', async () => {
    mockUseSWR.mockImplementation((key: string | null) => {
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
  })

  test('auto-selects the first chart and renders the song table', async () => {
    const mockPlayQueue = vi.fn()
    mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector
        ? selector({ playQueue: mockPlayQueue } as unknown as Record<string, unknown>)
        : { playQueue: mockPlayQueue }
    )

    mockUseSWR.mockImplementation((key: string | null) => {
      if (key === 'toplist') {
        return swrState({
          data: [{ id: 3779629, name: '新歌榜', coverImgUrl: 'https://x/1.jpg' }],
        })
      }
      if (key === 'top-list-3779629') {
        return swrState({
          data: {
            name: '新歌榜',
            coverImgUrl: 'https://x/1.jpg',
            tracks: [
              { id: 1, name: 'Song A' },
              { id: 2, name: 'Song B' },
            ] as never,
          },
        })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    // Allow the auto-select effect to flush.
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('leaderboard-detail')).toBeInTheDocument()
    expect(screen.getByTestId('song-table')).toHaveTextContent('2 songs')
  })

  test('opens the chart id from the query string before auto-selecting the first chart', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('id=19723756'))

    mockUseSWR.mockImplementation((key: string | null) => {
      if (key === 'toplist') {
        return swrState({
          data: [
            { id: 3779629, name: '新歌榜', coverImgUrl: 'https://x/1.jpg' },
            { id: 19723756, name: '飙升榜', coverImgUrl: 'https://x/2.jpg' },
          ],
        })
      }
      if (key === 'top-list-19723756') {
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
    expect(screen.getByTestId('song-table')).toHaveTextContent('1 songs')
    expect(mockUseSWR.mock.calls.some(([key]) => key === 'top-list-19723756')).toBe(true)
  })

  test('shows loading skeleton when detail is loading', async () => {
    mockUseSWR.mockImplementation((key: string | null) => {
      if (key === 'toplist') {
        return swrState({
          data: [{ id: 1, name: 'X', coverImgUrl: '' }],
        })
      }
      if (key?.startsWith('top-list-')) {
        return swrState({ isLoading: true })
      }
      return swrState()
    })

    const { default: LeaderboardPage } = await import('@/app/leaderboard/page')
    render(<LeaderboardPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument()
  })
})

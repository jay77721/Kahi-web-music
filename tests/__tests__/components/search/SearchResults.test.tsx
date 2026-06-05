'use client'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SearchResults } from '@/components/search/SearchResults'

const SEARCH_RESULTS_SOURCE = join(process.cwd(), 'components/search/SearchResults.tsx')

const { mockUseSWR } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock child components
// ---------------------------------------------------------------------------
vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('@/components/common/SongTable', () => ({
  SongTable: ({ songs }: { songs: unknown[] }) => <div data-testid="song-table">SongTable:{songs.length}</div>,
}))

vi.mock('@/components/common/PlaylistCard', () => ({
  PlaylistCard: () => <div data-testid="playlist-card">PlaylistCard</div>,
}))

vi.mock('@/components/search/SearchEmptyState', () => ({
  SearchEmptyState: ({ type }: { type: string }) => (
    <div data-testid="search-empty">Empty: {type}</div>
  ),
}))

beforeEach(() => {
  mockUseSWR.mockReset()
  mockUseSWR.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
})

describe('SearchResults', () => {
  // ---- Tabs rendering ----
  describe('tabs rendering', () => {
    test('renders all five search category labels', () => {
      render(<SearchResults keywords="周杰伦" />)
      expect(screen.getAllByText('歌曲').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('歌手').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('专辑').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('歌单').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('MV').length).toBeGreaterThanOrEqual(1)
    })

    test('defaults to songs tab active on initial render', () => {
      render(<SearchResults keywords="test" />)
      // The songs tab label should be rendered
      expect(screen.getAllByText('歌曲').length).toBeGreaterThanOrEqual(1)
    })

    test('mounts only the active result panel', () => {
      render(<SearchResults keywords="test" />)

      expect(screen.getAllByTestId('search-empty')).toHaveLength(1)
      expect(screen.getByTestId('search-empty')).toHaveTextContent('songs')

      fireEvent.click(screen.getByRole('tab', { name: '歌手' }))

      expect(screen.getAllByTestId('search-empty')).toHaveLength(1)
      expect(screen.getByTestId('search-empty')).toHaveTextContent('artists')
    })
  })

  // ---- Keywords prop ----
  describe('keywords', () => {
    test('renders without crashing when keywords change', () => {
      const { rerender } = render(<SearchResults keywords="晴天" />)
      rerender(<SearchResults keywords="夜曲" />)
      expect(screen.getAllByText('歌曲').length).toBeGreaterThanOrEqual(1)
    })

    test('renders tabs with provided keywords', () => {
      render(<SearchResults keywords="test" />)
      expect(screen.getAllByText('歌曲').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ---- Component stability ----
  describe('component stability', () => {
    test('does not depend on framer-motion runtime', () => {
      const source = readFileSync(SEARCH_RESULTS_SOURCE, 'utf8')

      expect(source).not.toMatch(/from ['"]framer-motion['"]/)
      expect(source).not.toContain('motion.')
      expect(source).not.toContain('staggerContainer')
      expect(source).not.toContain('staggerItem')
    })

    test('does not throw on render', () => {
      expect(() => render(<SearchResults keywords="test" />)).not.toThrow()
    })

    test('renders tab buttons', () => {
      render(<SearchResults keywords="test" />)
      const songsTab = screen.getAllByText('歌曲')[0].closest('button')
      expect(songsTab).toBeTruthy()
    })

    test('shows a semantic loading state for the active tab', () => {
      mockUseSWR.mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
        isValidating: true,
        mutate: vi.fn(),
      })

      render(<SearchResults keywords="test" />)

      expect(screen.getByRole('status', { name: '正在加载搜索结果' })).toBeInTheDocument()
      expect(screen.getByTestId('search-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('search-empty')).not.toBeInTheDocument()
    })

    test('trims keywords before building the search key', () => {
      render(<SearchResults keywords="  jay  " />)

      expect(mockUseSWR.mock.calls[0][0]).toBe('search:jay:1')
      expect(mockUseSWR.mock.calls[0][2]).toEqual(
        expect.objectContaining({ revalidateOnFocus: false, keepPreviousData: false })
      )
    })

    test('renders song results when the normalized song count is positive', () => {
      mockUseSWR.mockReturnValue({
        data: {
          songs: [{ id: 1, name: '晴天' }],
          songCount: 1,
          artists: [],
          artistCount: 0,
          albums: [],
          albumCount: 0,
          playlists: [],
          playlistCount: 0,
          mvs: [],
          mvCount: 0,
        },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      })

      render(<SearchResults keywords="晴天" />)

      expect(screen.getByTestId('song-table')).toHaveTextContent('SongTable:1')
      expect(screen.queryByTestId('search-empty')).not.toBeInTheDocument()
    })

    test('renders playlist results without framer-motion DOM markers', () => {
      mockUseSWR.mockImplementation((key: string | null) => ({
        data: key === 'search:test:1000'
          ? {
              songs: [],
              songCount: 0,
              artists: [],
              artistCount: 0,
              albums: [],
              albumCount: 0,
              playlists: [{ id: 1, name: 'Plain Playlist', coverImgUrl: '/cover.jpg', playCount: 42 }],
              playlistCount: 1,
              mvs: [],
              mvCount: 0,
            }
          : {
              songs: [],
              songCount: 0,
              artists: [],
              artistCount: 0,
              albums: [],
              albumCount: 0,
              playlists: [],
              playlistCount: 0,
              mvs: [],
              mvCount: 0,
            },
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      }))

      const { container } = render(<SearchResults keywords="test" />)
      fireEvent.click(screen.getAllByRole('tab')[3])

      expect(screen.getByTestId('playlist-card')).toBeInTheDocument()
      expect(container.querySelector('[data-framer-motion]')).toBeNull()
    })
  })
})

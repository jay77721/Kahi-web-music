'use client'

import { afterEach, describe, test, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SearchResults } from '@/components/search/SearchResults'

// ---------------------------------------------------------------------------
// Mock child components
// ---------------------------------------------------------------------------
vi.mock('@/components/common/SongTable', () => ({
  SongTable: () => <div data-testid="song-table">SongTable</div>,
}))

vi.mock('@/components/common/PlaylistCard', () => ({
  PlaylistCard: () => <div data-testid="playlist-card">PlaylistCard</div>,
}))

vi.mock('@/components/search/SearchEmptyState', () => ({
  SearchEmptyState: ({ type }: { type: string }) => (
    <div data-testid="search-empty">Empty: {type}</div>
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} alt={(rest.alt as string) ?? ''} />
  },
}))

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
    test('does not throw on render', () => {
      expect(() => render(<SearchResults keywords="test" />)).not.toThrow()
    })

    test('renders tab buttons', () => {
      render(<SearchResults keywords="test" />)
      const songsTab = screen.getAllByText('歌曲')[0].closest('button')
      expect(songsTab).toBeTruthy()
    })
  })
})

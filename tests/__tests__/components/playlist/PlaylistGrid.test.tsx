import { describe, test, expect, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PlaylistGrid } from '@/components/playlist/PlaylistGrid'
import type { Playlist } from '@/types/playlist'

// Stub next/image so it renders a plain <img>.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height } = props as {
      src: string
      alt: string
      width?: number
      height?: number
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} />
  },
}))

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 1,
    name: '测试歌单',
    coverImgUrl: 'https://pics.example.com/p/1.jpg',
    creator: { userId: 1, nickname: 'me' },
    trackCount: 10,
    playCount: 1000,
    subscribedCount: 5,
    createTime: 0,
    updateTime: 0,
    ...overrides,
  } as Playlist
}

afterEach(() => {
  cleanup()
})

describe('PlaylistGrid', () => {
  describe('rendering', () => {
    test('renders an empty container (null) when no playlists are provided', () => {
      const { container } = render(<PlaylistGrid playlists={[]} />)
      expect(container.firstChild).toBeNull()
    })

    test('renders a list with role="list" and accessible label', () => {
      render(<PlaylistGrid playlists={[makePlaylist()]} ariaLabel="我的歌单" />)
      const list = screen.getByRole('list', { name: '我的歌单' })
      expect(list).toBeInTheDocument()
    })

    test('renders one list item per playlist', () => {
      const playlists = [
        makePlaylist({ id: 1, name: '华语' }),
        makePlaylist({ id: 2, name: '欧美' }),
        makePlaylist({ id: 3, name: '日语' }),
      ]
      const { container } = render(<PlaylistGrid playlists={playlists} />)
      const items = container.querySelectorAll('[data-playlist-id]')
      expect(items.length).toBe(3)
      const ids = Array.from(items).map((n) => n.getAttribute('data-playlist-id'))
      expect(ids).toEqual(['1', '2', '3'])
    })

    test('renders each playlist name as text content', () => {
      const playlists = [
        makePlaylist({ id: 1, name: '华语精选' }),
        makePlaylist({ id: 2, name: '摇滚经典' }),
      ]
      render(<PlaylistGrid playlists={playlists} />)
      expect(screen.getByText('华语精选')).toBeInTheDocument()
      expect(screen.getByText('摇滚经典')).toBeInTheDocument()
    })

    test('applies responsive grid columns to the list container', () => {
      const { container } = render(<PlaylistGrid playlists={[makePlaylist()]} />)
      const list = container.querySelector('[role="list"]') as HTMLElement
      expect(list).toHaveClass('grid')
      expect(list).toHaveClass('grid-cols-2')
      expect(list).toHaveClass('sm:grid-cols-3')
      expect(list).toHaveClass('md:grid-cols-4')
      expect(list).toHaveClass('lg:grid-cols-5')
      expect(list).toHaveClass('xl:grid-cols-6')
    })

    test('applies custom className alongside the grid classes', () => {
      const { container } = render(
        <PlaylistGrid playlists={[makePlaylist()]} className="mt-6" />
      )
      const list = container.querySelector('[role="list"]') as HTMLElement
      expect(list).toHaveClass('mt-6')
      expect(list).toHaveClass('grid')
    })

    test('renders links pointing at /playlist/{id}', () => {
      render(
        <PlaylistGrid
          playlists={[
            makePlaylist({ id: 42, name: 'Alpha' }),
            makePlaylist({ id: 99, name: 'Beta' }),
          ]}
        />
      )
      const links = screen.getAllByRole('link')
      const hrefs = links.map((a) => a.getAttribute('href'))
      expect(hrefs).toContain('/playlist/42')
      expect(hrefs).toContain('/playlist/99')
    })
  })

  describe('stagger animation', () => {
    test('container is rendered as a framer-motion element', () => {
      const { container } = render(<PlaylistGrid playlists={[makePlaylist()]} />)
      const list = container.querySelector('[role="list"]') as HTMLElement
      expect(list.getAttribute('data-framer-motion')).toBe('true')
    })

    test('each playlist item is rendered as a framer-motion element', () => {
      const playlists = [
        makePlaylist({ id: 1 }),
        makePlaylist({ id: 2 }),
        makePlaylist({ id: 3 }),
      ]
      const { container } = render(<PlaylistGrid playlists={playlists} />)
      const items = container.querySelectorAll('[data-playlist-id]')
      expect(items.length).toBe(3)
      items.forEach((item) => {
        expect(item.getAttribute('data-framer-motion')).toBe('true')
      })
    })

    test('stagger container is the ancestor of every list item', () => {
      const playlists = [
        makePlaylist({ id: 1 }),
        makePlaylist({ id: 2 }),
      ]
      const { container } = render(<PlaylistGrid playlists={playlists} />)
      const list = container.querySelector('[role="list"]') as HTMLElement
      const items = container.querySelectorAll('[data-playlist-id]')
      items.forEach((item) => {
        expect(list.contains(item)).toBe(true)
      })
    })
  })
})

import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Stub useDominantColor so tests don't touch canvas / fetch.
vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: () => ({ color: null, isLoading: false, error: null }),
}))

import { HeroBanner } from '@/components/playlist/HeroBanner'

afterEach(() => {
  cleanup()
})

describe('HeroBanner', () => {
  test('renders the title text', () => {
    render(
      <HeroBanner cover="https://pics.example.com/playlist/3001.jpg" title="华语经典老歌" />
    )
    expect(screen.getByRole('heading', { name: '华语经典老歌' })).toBeInTheDocument()
  })

  test('renders the subtitle when provided', () => {
    render(
      <HeroBanner
        cover="https://pics.example.com/playlist/3001.jpg"
        title="华语经典老歌"
        subtitle="那些年我们一起听过的歌"
      />
    )
    expect(screen.getByText('那些年我们一起听过的歌')).toBeInTheDocument()
  })

  test('accepts meta data for plays / count / creator', () => {
    render(
      <HeroBanner
        cover="https://pics.example.com/playlist/3001.jpg"
        title="华语经典老歌"
        meta={{ plays: '123万', count: 50, creator: <span>音乐爱好者</span> }}
      />
    )
    expect(screen.getByText('音乐爱好者')).toBeInTheDocument()
    expect(screen.getByText('50 首')).toBeInTheDocument()
    expect(screen.getByText('播放 123万')).toBeInTheDocument()
  })

  test('renders a badge when supplied', () => {
    render(
      <HeroBanner cover="https://example.com/c.jpg" title="测试" badge="歌单" />
    )
    expect(screen.getByText('歌单')).toBeInTheDocument()
  })

  test('renders provided action nodes', () => {
    render(
      <HeroBanner
        cover="https://example.com/c.jpg"
        title="测试"
        actions={<button type="button">播放全部</button>}
      />
    )
    expect(screen.getByRole('button', { name: '播放全部' })).toBeInTheDocument()
  })

  test('falls back gracefully when cover is empty', () => {
    const { container } = render(<HeroBanner cover="" title="无封面歌单" />)
    expect(screen.getByRole('heading', { name: '无封面歌单' })).toBeInTheDocument()
    expect(container.querySelector('[data-testid="hero-banner-cover-fallback"]')).toBeInTheDocument()
  })

  test('hides meta row entirely when no fields are provided', () => {
    render(<HeroBanner cover="https://example.com/c.jpg" title="测试" meta={{}} />)
    expect(screen.queryByText(/播放/)).toBeNull()
    expect(screen.queryByText(/首/)).toBeNull()
  })

  test('applies user-provided className', () => {
    const { container } = render(
      <HeroBanner cover="https://example.com/c.jpg" title="测试" className="custom-hero" />
    )
    const banner = container.querySelector('[data-testid="hero-banner"]')
    expect(banner).toHaveClass('custom-hero')
    expect(banner?.tagName).toBe('SECTION')
  })
})

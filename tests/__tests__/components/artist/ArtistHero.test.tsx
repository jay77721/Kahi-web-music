'use client'

import { readFileSync } from 'node:fs'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { Artist } from '@/types/artist'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseDominantColor = vi.fn()

vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: (...args: unknown[]) => mockUseDominantColor(...args),
}))

import { ArtistHero } from '@/components/artist/ArtistHero'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_ARTIST: Artist = {
  id: 1,
  name: '周杰伦',
  picUrl: 'https://pics.example.com/artist/1.jpg',
  img1v1Url: 'https://pics.example.com/artist/1-1v1.jpg',
  alias: ['Jay', '周董'],
  albumSize: 15,
  musicSize: 200,
  mvSize: 50,
}

const ARTIST_HERO_SOURCE = 'components/artist/ArtistHero.tsx'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArtistHero', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders the artist name and a round avatar', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    render(<ArtistHero artist={FAKE_ARTIST} />)
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
    expect(screen.getByAltText('周杰伦')).toBeInTheDocument()
  })

  test('uses CSS animation without framer-motion runtime markers', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    const { container } = render(<ArtistHero artist={FAKE_ARTIST} />)

    expect(screen.getByTestId('artist-hero')).toHaveClass('animate-fade-in')
    expect(container.querySelector('.animate-scale-in')).toBeInTheDocument()
    expect(container.querySelector('.animate-slide-up')).toBeInTheDocument()
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('does not import framer-motion', () => {
    const source = readFileSync(ARTIST_HERO_SOURCE, 'utf8')

    expect(source).not.toContain('framer-motion')
    expect(source).not.toContain('motion.')
    expect(source).not.toContain('Variants')
  })

  test('defers dominant color extraction until idle time', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    render(<ArtistHero artist={FAKE_ARTIST} />)

    expect(mockUseDominantColor).toHaveBeenCalledWith(
      expect.stringContaining('param=160y160'),
      {
        timeoutMs: 5000,
        deferUntilIdle: true,
        idleTimeoutMs: 1500,
      }
    )
  })

  test('renders the alias when present', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    render(<ArtistHero artist={FAKE_ARTIST} />)
    expect(screen.getByText('Jay · 周董')).toBeInTheDocument()
  })

  test('renders fan count when provided', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    render(<ArtistHero artist={FAKE_ARTIST} fanCount={12500} />)
    expect(screen.getByText(/粉丝/)).toBeInTheDocument()
  })

  test('hides fan count when zero or undefined', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    render(<ArtistHero artist={FAKE_ARTIST} />)
    expect(screen.queryByText(/粉丝/)).not.toBeInTheDocument()
  })

  test('renders description clamped by default and expanded on click', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    const longBio =
      '他是华语流行音乐的代表人物，' +
      '创作了无数经典作品，' +
      '影响了整整一代人的青春。'
    const { container } = render(
      <ArtistHero artist={FAKE_ARTIST} description={longBio} />
    )
    const desc = screen.getByTestId('artist-description')
    expect(desc).toHaveTextContent(longBio)
    // Truncate class applied when not expanded
    expect(desc.className).toContain('truncate-3')
    // Toggle button is present
    const toggle = screen.getByRole('button', { name: '展开' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    // After click, the truncate class is removed
    expect(container.querySelector('[data-testid="artist-description"]')?.className).not.toContain(
      'truncate-3'
    )
    expect(screen.getByRole('button', { name: '收起' })).toHaveAttribute('aria-expanded', 'true')
  })

  test('omits the description block when no description is provided', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    render(<ArtistHero artist={FAKE_ARTIST} />)
    expect(screen.queryByTestId('artist-description')).not.toBeInTheDocument()
  })

  test('falls back gracefully when the artist has no cover image', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    const noCover: Artist = { ...FAKE_ARTIST, picUrl: undefined, img1v1Url: undefined }
    render(<ArtistHero artist={noCover} />)
    expect(screen.queryByAltText('周杰伦')).not.toBeInTheDocument()
  })

  test('applies a user-provided className to the root element', () => {
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    const { container } = render(
      <ArtistHero artist={FAKE_ARTIST} className="custom-class" />
    )
    expect(container.querySelector('[data-testid="artist-hero"]')).toHaveClass('custom-class')
  })
})

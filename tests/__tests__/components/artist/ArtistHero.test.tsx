'use client'

import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Artist } from '@/types/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseDominantColor = vi.fn()

vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: (...args: unknown[]) => mockUseDominantColor(...args),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height } = props as {
      src: string
      alt: string
      width?: number
      height?: number
    }
    return React.createElement('img', { src, alt, width, height })
  },
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
    // framer-motion mock collapses motion.h1 to a div, so we use getByText.
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
    expect(screen.getByAltText('周杰伦')).toBeInTheDocument()
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

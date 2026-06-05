import { describe, test, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render, screen } from '@/tests/helpers/test-utils'
import { VinylDisc } from '@/components/player/VinylDisc'

describe('VinylDisc', () => {
  afterEach(() => cleanup())

  test('renders the cover image with the supplied URL', () => {
    const { container } = render(<VinylDisc coverUrl="https://example.com/cover.jpg" isPlaying={false} />)
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    // imageUrl() in lib/format appends `?param={size}y{size}`.
    expect(img?.getAttribute('src')).toContain('example.com/cover.jpg')
  })

  test('toggles the playing class when isPlaying changes', () => {
    const { rerender } = render(<VinylDisc coverUrl="x" isPlaying={false} />)
    const disc = screen.getByTestId('vinyl-disc')
    expect(disc.className).toContain('vinyl-disc--paused')
    expect(disc.className).not.toContain('vinyl-disc--playing')

    rerender(<VinylDisc coverUrl="x" isPlaying={true} />)
    const playingDisc = screen.getByTestId('vinyl-disc')
    expect(playingDisc.className).toContain('vinyl-disc--playing')
    expect(playingDisc.className).not.toContain('vinyl-disc--paused')
    expect(playingDisc.getAttribute('data-playing')).toBe('true')
  })

  test('uses the size prop to set the disc dimensions', () => {
    render(<VinylDisc coverUrl="x" isPlaying={false} size={400} />)
    const disc = screen.getByTestId('vinyl-disc')
    expect(disc.getAttribute('data-size')).toBe('400')
    expect((disc as HTMLElement).style.width).toBe('400px')
    expect((disc as HTMLElement).style.height).toBe('400px')
  })

  test('falls back to the default size when no prop is given', () => {
    render(<VinylDisc coverUrl="x" isPlaying={false} />)
    const disc = screen.getByTestId('vinyl-disc')
    expect(disc.getAttribute('data-size')).toBe('280')
  })

  test('renders without a cover when coverUrl is empty', () => {
    const { container } = render(<VinylDisc coverUrl="" isPlaying={false} />)
    // The disc shell is always rendered; only the <img> is conditional.
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByTestId('vinyl-disc')).toBeInTheDocument()
  })
})

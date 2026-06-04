import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { BlurImage } from '@/components/common/BlurImage'

// Auto-cleanup is not reliable in this Vitest setup; ensure each test
// starts from an empty DOM so `getBy*` queries find a single element.
afterEach(() => {
  cleanup()
})

describe('BlurImage', () => {
  test('renders an <img> with the provided alt text', () => {
    render(
      <BlurImage
        src="https://example.com/cover.jpg"
        alt="Album cover"
        width={200}
        height={200}
      />
    )
    expect(screen.getByAltText('Album cover')).toBeInTheDocument()
  })

  test('forwards custom className to the rendered image', () => {
    render(
      <BlurImage
        src="https://example.com/cover.jpg"
        alt="Forwarded class"
        width={200}
        height={200}
        className="my-cover-class"
      />
    )
    const img = screen.getByAltText('Forwarded class')
    expect(img).toHaveClass('my-cover-class')
  })

  test('applies blur-placeholder class by default', () => {
    render(
      <BlurImage
        src="https://example.com/cover.jpg"
        alt="Placeholder default"
        width={200}
        height={200}
      />
    )
    const img = screen.getByAltText('Placeholder default')
    expect(img).toHaveClass('blur-placeholder')
  })

  test('does not start with --loaded modifier', () => {
    render(
      <BlurImage
        src="https://example.com/cover.jpg"
        alt="Initial state"
        width={200}
        height={200}
      />
    )
    const img = screen.getByAltText('Initial state')
    expect(img).not.toHaveClass('blur-placeholder--loaded')
  })

  test('defaults to loading="lazy" for offscreen images', () => {
    render(
      <BlurImage
        src="https://example.com/cover.jpg"
        alt="Lazy cover"
        width={200}
        height={200}
      />
    )
    const img = screen.getByAltText('Lazy cover')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  test('honours explicit priority prop for above-the-fold images', () => {
    render(
      <BlurImage
        src="https://example.com/cover.jpg"
        alt="Hero cover"
        width={200}
        height={200}
        priority
      />
    )
    const img = screen.getByAltText('Hero cover')
    // priority images opt out of lazy loading
    expect(img.getAttribute('loading')).not.toBe('lazy')
  })
})


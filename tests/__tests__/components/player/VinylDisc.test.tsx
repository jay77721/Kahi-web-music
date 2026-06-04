import { describe, test, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render, screen } from '@/tests/helpers/test-utils'
import { VinylDisc } from '@/components/player/VinylDisc'

// The global SWR mock in tests/helpers/setup.ts only re-exports a default
// hook; the test-utils wrapper relies on `SWRConfig`. Re-mock here so we
// get a working provider without dragging in the rest of SWR.
const sharedCache = new Map<string, { data?: unknown; error?: unknown; isValidating?: boolean; isLoading?: boolean }>()
vi.mock('swr', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const fakeMutate = async (key: string, data: unknown) => {
    const entry = sharedCache.get(key) ?? {}
    entry.data = data
    sharedCache.set(key, entry)
    return data
  }
  return {
    ...actual,
    useSWRConfig: () => ({ cache: sharedCache, mutate: fakeMutate }),
    mutate: fakeMutate,
  }
})

// next/image is mocked away to a plain <img> in the test setup; the
// mock uses `unoptimized` so we never need a real image host.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, className, style } = props
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src as string}
        alt={(alt as string) ?? ''}
        width={width as number}
        height={height as number}
        className={className as string}
        style={style as React.CSSProperties}
      />
    )
  },
}))

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

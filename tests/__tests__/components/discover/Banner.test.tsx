import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Banner } from '@/components/discover/Banner'

const swrCalls = vi.hoisted(() => [] as Array<{ key: string; options?: Record<string, unknown> }>)
const mockBanners = vi.hoisted(() => [
  {
    imageUrl: 'https://example.com/banner-a.jpg',
    targetId: 1,
    targetType: 1,
    typeTitle: '推荐',
  },
  {
    imageUrl: 'https://example.com/banner-b.jpg',
    targetId: 2,
    targetType: 1,
    typeTitle: '新歌',
  },
])

type IntersectionCallback = IntersectionObserverCallback

vi.mock('swr', () => ({
  default: (key: string, _fetcher: unknown, options?: Record<string, unknown>) => {
    swrCalls.push({ key, options })
    return {
      data: mockBanners,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    }
  },
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  swrCalls.length = 0
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})

describe('Banner', () => {
  test('renders only the active banner image to avoid eager carousel image fetches', () => {
    render(<Banner />)

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img', { name: '推荐' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '推荐' })).toHaveAttribute('sizes')
    expect(swrCalls[0]).toMatchObject({
      key: 'banner',
      options: { revalidateOnFocus: false, dedupingInterval: 60_000 },
    })

    fireEvent.click(screen.getByRole('button', { name: '切换到第 2 张' }))

    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img', { name: '新歌' })).toBeInTheDocument()
  })

  test('toggles pause aria-pressed without parent focus or pointer handlers overriding it', () => {
    render(<Banner />)

    const pauseButton = screen.getByRole('button', { name: '暂停自动轮播' })
    expect(pauseButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(pauseButton)
    fireEvent.focus(pauseButton)
    fireEvent.click(pauseButton)

    const resumeButton = screen.getByRole('button', { name: '恢复自动轮播' })
    expect(resumeButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.pointerDown(resumeButton)
    fireEvent.focus(resumeButton)
    fireEvent.click(resumeButton)

    expect(screen.getByRole('button', { name: '暂停自动轮播' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  test('does not auto-rotate while the tab is hidden', () => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })

    render(<Banner />)

    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', expect.stringContaining('banner-a'))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', expect.stringContaining('banner-a'))

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    fireEvent(document, new Event('visibilitychange'))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', expect.stringContaining('banner-b'))
  })

  test('does not auto-rotate while scrolled offscreen', () => {
    vi.useFakeTimers()
    const originalIntersectionObserver = window.IntersectionObserver
    let intersectionCallback: IntersectionCallback | null = null

    class MockIntersectionObserver {
      readonly root = null
      readonly rootMargin = ''
      readonly thresholds = []
      disconnect = vi.fn()
      observe = vi.fn()
      takeRecords = vi.fn(() => [])
      unobserve = vi.fn()

      constructor(callback: IntersectionCallback) {
        intersectionCallback = callback
      }
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: MockIntersectionObserver,
    })

    render(<Banner />)
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', expect.stringContaining('banner-a'))

    act(() => {
      intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', expect.stringContaining('banner-a'))

    act(() => {
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', expect.stringContaining('banner-b'))

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: originalIntersectionObserver,
    })
  })
})

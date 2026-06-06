import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { BentoGrid } from '@/components/discover/BentoGrid'

type SwrCall = {
  key: string
  options?: {
    revalidateOnFocus?: boolean
    dedupingInterval?: number
  }
}

type IntersectionObserverCallback = (
  entries: Array<{ isIntersecting: boolean }>,
  observer: { disconnect: () => void }
) => void

const swrState = vi.hoisted(() => ({
  calls: [] as SwrCall[],
  observerCallback: null as IntersectionObserverCallback | null,
  observerOptions: null as IntersectionObserverInit | null,
  dataByKey: {
    'bento-radar': {
      id: 101,
      name: 'Radar Mix',
      picUrl: 'https://images.example.com/radar.jpg',
      playCount: 1000,
    },
    'bento-newsong': {
      id: 202,
      name: 'Fresh Single',
      picUrl: 'https://images.example.com/new-song.jpg',
      song: {
        al: { picUrl: 'https://images.example.com/new-song-album.jpg' },
        ar: [{ name: 'Artist' }],
      },
    },
    'bento-toplist': [
      {
        id: 301,
        name: 'Hot Rank',
        coverImgUrl: 'https://images.example.com/hot-rank.jpg',
      },
      {
        id: 302,
        name: 'New Rank',
        coverImgUrl: 'https://images.example.com/new-rank.jpg',
      },
    ],
  } as Record<string, unknown>,
}))

vi.mock('swr', () => ({
  default: (key: string | null, _fetcher: unknown, options?: SwrCall['options']) => {
    if (!key) {
      return {
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      }
    }

    swrState.calls.push({ key, options })
    return {
      data: swrState.dataByKey[key],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    }
  },
}))

describe('BentoGrid', () => {
  beforeEach(() => {
    swrState.calls = []
    swrState.observerCallback = null
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        swrState.observerCallback = callback
        swrState.observerOptions = options ?? null
      }

      observe = vi.fn()
      disconnect = vi.fn()
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  test('defers toplist until the bento grid approaches the viewport', () => {
    render(<BentoGrid />)

    expect(swrState.calls.map((call) => call.key)).toEqual([
      'bento-radar',
      'bento-newsong',
    ])
    expect(swrState.calls.map((call) => call.key)).not.toContain('bento-toplist')
    expect(swrState.calls.map((call) => call.key)).not.toContain('bento-artists')
    expect(swrState.calls.every((call) => call.options?.revalidateOnFocus === false)).toBe(true)
    expect(swrState.observerOptions).toEqual({ rootMargin: '0px 0px -25% 0px' })

    act(() => {
      swrState.observerCallback?.(
        [{ isIntersecting: true }],
        { disconnect: vi.fn() }
      )
    })

    expect(swrState.calls.map((call) => call.key)).toContain('bento-toplist')
  })

  test('renders the static artist shortcut without an extra cover image', () => {
    const { container } = render(<BentoGrid />)

    expect(container.querySelectorAll('img')).toHaveLength(2)
    expect(container.querySelector('a[href="/search"]')).toBeTruthy()
    expect(container.querySelector('a[href="/playlist/101"]')).toBeTruthy()
    expect(container.querySelector('a[href="/song/202"]')).toBeTruthy()
  })

  test('uses CSS entry and stagger classes without framer-motion markers', () => {
    const { container, getAllByRole, getByRole } = render(<BentoGrid />)

    expect(getByRole('list', { name: 'Bento discover grid' })).toHaveClass(
      'section-enter',
      'stagger-children'
    )
    expect(getAllByRole('listitem')).toHaveLength(5)
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('does not import framer-motion', () => {
    const source = readFileSync('components/discover/BentoGrid.tsx', 'utf8')

    expect(source).not.toMatch(/from ['"]framer-motion['"]/)
  })
})

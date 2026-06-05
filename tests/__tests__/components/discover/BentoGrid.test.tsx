import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { HTMLAttributes, ReactNode } from 'react'
import { BentoGrid } from '@/components/discover/BentoGrid'

type SwrCall = {
  key: string
  options?: {
    revalidateOnFocus?: boolean
    dedupingInterval?: number
  }
}

const swrState = vi.hoisted(() => ({
  calls: [] as SwrCall[],
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

type MotionDivMockProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  initial?: unknown
  animate?: unknown
  variants?: unknown
  whileHover?: unknown
  whileTap?: unknown
  transition?: unknown
}

function stripMotionProps(props: MotionDivMockProps) {
  const domProps = { ...props }
  delete domProps.initial
  delete domProps.animate
  delete domProps.variants
  delete domProps.whileHover
  delete domProps.whileTap
  delete domProps.transition
  return domProps
}

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: MotionDivMockProps) => {
      const { children, ...rest } = stripMotionProps(props)
      return <div {...rest}>{children}</div>
    },
  },
}))

vi.mock('swr', () => ({
  default: (key: string, _fetcher: unknown, options?: SwrCall['options']) => {
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
  })

  afterEach(() => {
    cleanup()
  })

  test('registers only the first-screen dynamic bento fetches', () => {
    render(<BentoGrid />)

    expect(swrState.calls.map((call) => call.key)).toEqual([
      'bento-radar',
      'bento-newsong',
      'bento-toplist',
    ])
    expect(swrState.calls.map((call) => call.key)).not.toContain('bento-artists')
    expect(swrState.calls.every((call) => call.options?.revalidateOnFocus === false)).toBe(true)
  })

  test('renders the static artist shortcut without an extra cover image', () => {
    const { container } = render(<BentoGrid />)

    expect(container.querySelectorAll('img')).toHaveLength(4)
    expect(container.querySelector('a[href="/search"]')).toBeTruthy()
    expect(container.querySelector('a[href="/playlist/101"]')).toBeTruthy()
    expect(container.querySelector('a[href="/song/202"]')).toBeTruthy()
  })
})

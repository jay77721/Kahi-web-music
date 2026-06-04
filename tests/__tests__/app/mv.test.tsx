'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import type { MV } from '@/types/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseParams = vi.fn()
const mockUseSWR = vi.fn()

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    mvUrl: vi.fn(),
    mvDetail: vi.fn(),
    mvDetailInfo: vi.fn(),
    simiMv: vi.fn(),
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/comment/CommentList', () => ({
  CommentList: () => React.createElement('div', { 'data-testid': 'comment-list' }),
}))

vi.mock('@/components/mv/MVPlayer', () => ({
  MVPlayer: ({ src }: { src: string | null }) =>
    React.createElement(
      'div',
      { 'data-testid': 'mv-player', 'data-src': src ?? '' },
      src ? 'playing' : 'no-source'
    ),
}))

vi.mock('@/components/mv/MVInfo', () => ({
  MVInfo: ({ mv }: { mv: MV }) =>
    React.createElement(
      'aside',
      { 'data-testid': 'mv-info' },
      React.createElement('h1', null, mv.name)
    ),
}))

vi.mock('@/components/player/PlayerBar', () => ({ PlayerBar: () => null }))
vi.mock('@/components/player/PlayerOverlays', () => ({ PlayerOverlays: () => null }))

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

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => React.createElement('a', { href, ...rest }, children),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_MV: MV = {
  id: 54321,
  name: '夜曲',
  picUrl: 'https://pics.example.com/mv/54321.jpg',
  cover: 'https://pics.example.com/mv/54321.jpg',
  artistId: 101,
  artistName: '周杰伦',
  publishTime: '2024-08-12',
  duration: 240,
  playCount: 1_500_000,
  desc: '一首经典 MV #经典 #华语 #流行',
}

const FAKE_SIMI: MV[] = Array.from({ length: 4 }, (_, i) => ({
  id: 60000 + i,
  name: `相似 MV ${i + 1}`,
  picUrl: `https://pics.example.com/mv/${60000 + i}.jpg`,
  cover: `https://pics.example.com/mv/${60000 + i}.jpg`,
  artistId: 200 + i,
  artistName: `歌手 ${i + 1}`,
  playCount: 50_000 * (i + 1),
}))

function makeLoadedData() {
  return {
    url: 'https://cdn.example.com/mv/54321.m3u8',
    mv: FAKE_MV,
    info: { likedCount: 12_345, shareCount: 678, commentCount: 0, code: 200 },
    simiMvs: FAKE_SIMI,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MVPage', () => {
  beforeEach(() => {
    mockUseParams.mockReset()
    mockUseSWR.mockReset()
    mockUseParams.mockReturnValue({ id: '54321' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders the loading skeleton while SWR is fetching', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('mv-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('mv-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mv-info')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mv-similar')).not.toBeInTheDocument()
  })

  test('renders the error state when SWR returns an error', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network down'),
    })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('mv-error')).toBeInTheDocument()
    expect(screen.getByText('MV 不存在或加载失败')).toBeInTheDocument()
    expect(screen.queryByTestId('mv-page')).not.toBeInTheDocument()
  })

  test('renders the error state when the bundle is missing the MV detail', async () => {
    mockUseSWR.mockReturnValue({
      data: { url: null, mv: null, info: null, simiMvs: [] },
      isLoading: false,
      error: undefined,
    })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    expect(screen.getByTestId('mv-error')).toBeInTheDocument()
  })

  test('renders player, info, tags, comments, and similar MVs when loaded', async () => {
    mockUseSWR.mockReturnValue({
      data: makeLoadedData(),
      isLoading: false,
      error: undefined,
    })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    expect(screen.getByTestId('mv-page')).toBeInTheDocument()
    expect(screen.getByTestId('mv-player')).toBeInTheDocument()
    expect(screen.getByTestId('mv-info')).toBeInTheDocument()
    expect(screen.getByTestId('comment-list')).toBeInTheDocument()
    expect(screen.getByTestId('mv-similar')).toBeInTheDocument()
    expect(screen.getByTestId('mv-tags')).toBeInTheDocument()

    // Tag extraction picks the #hashtags out of the description
    const tagList = screen.getByTestId('mv-tags')
    expect(tagList.textContent).toContain('经典')
    expect(tagList.textContent).toContain('华语')
    expect(tagList.textContent).toContain('流行')

    // Similar MVs render as links to /mv/<id>
    const links = screen.getAllByRole('link', { name: /相似 MV \d/ })
    expect(links.length).toBe(4)
    expect(links[0]).toHaveAttribute('href', '/mv/60000')
  })

  test('caps similar MVs at 8 entries', async () => {
    const many: MV[] = Array.from({ length: 12 }, (_, i) => ({
      ...FAKE_SIMI[0],
      id: 70000 + i,
      name: `相似 ${i + 1}`,
    }))
    mockUseSWR.mockReturnValue({
      data: { ...makeLoadedData(), simiMvs: many },
      isLoading: false,
      error: undefined,
    })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    const links = screen.getAllByRole('link', { name: /相似 \d/ })
    expect(links.length).toBe(8)
  })

  test('omits the similar MVs section when none are returned', async () => {
    mockUseSWR.mockReturnValue({
      data: { ...makeLoadedData(), simiMvs: [] },
      isLoading: false,
      error: undefined,
    })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    expect(screen.queryByTestId('mv-similar')).not.toBeInTheDocument()
  })

  test('does not call SWR when id is missing from the route params', async () => {
    mockUseParams.mockReturnValue({})
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined })

    const { default: MVPage } = await import('@/app/mv/[id]/page')
    render(<MVPage />)

    const firstCall = mockUseSWR.mock.calls[0]
    expect(firstCall?.[0]).toBeFalsy()
  })
})

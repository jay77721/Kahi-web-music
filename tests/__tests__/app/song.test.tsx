'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import type { Song, LyricLine } from '@/types/song'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseParams = vi.fn()
const mockUseSWR = vi.fn()
const mockPlaySong = vi.fn()
const mockPlayQueue = vi.fn()
const mockTogglePlay = vi.fn()
const mockSeek = vi.fn()

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
    songDetail: vi.fn(),
    songLyric: vi.fn(),
    simiSong: vi.fn(),
    like: vi.fn(),
  },
}))

vi.mock('@/lib/lrc', () => ({
  parseLyricResponse: vi.fn(),
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector
      ? selector(makePlayerStore() as unknown as Record<string, unknown>)
      : makePlayerStore(),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({ isLoggedIn: true }),
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

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/song/SongHero', () => ({
  SongHero: ({ song }: { song: Song }) =>
    React.createElement(
      'div',
      { 'data-testid': 'song-hero' },
      React.createElement('h1', null, song.name)
    ),
}))

vi.mock('@/components/song/SongActions', () => ({
  SongActions: ({ song }: { song: Song }) =>
    React.createElement('div', { 'data-testid': 'song-actions' }, song.name),
}))

vi.mock('@/components/player/LyricsPanel', () => ({
  LyricsPanel: ({ lyrics }: { lyrics: LyricLine[]; currentTime: number }) =>
    React.createElement(
      'div',
      { 'data-testid': 'lyrics-panel', 'data-lyric-count': lyrics.length },
      `lyrics: ${lyrics.length}`
    ),
}))

vi.mock('@/components/comment/CommentList', () => ({
  CommentList: ({ id, type }: { id: string; type: string }) =>
    React.createElement('div', { 'data-testid': 'comment-list', 'data-resource-type': type }, id),
}))

vi.mock('@/components/player/PlayerBar', () => ({ PlayerBar: () => null }))
vi.mock('@/components/player/PlayerOverlays', () => ({ PlayerOverlays: () => null }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_SONG: Song = {
  id: 12345,
  name: '夜曲',
  ar: [{ id: 101, name: '周杰伦' }],
  al: { id: 999, name: '十一月的萧邦', picUrl: 'https://pics.example.com/al/999.jpg' },
  dt: 240000,
  mv: 0,
  publishTime: 1136044800000,
}

const FAKE_SIMI: Song[] = Array.from({ length: 12 }, (_, i) => ({
  id: 20000 + i,
  name: `相似 ${i + 1}`,
  ar: [{ id: 300 + i, name: `歌手 ${i + 1}` }],
  al: { id: 400 + i, name: `Album ${i + 1}`, picUrl: `https://pics.example.com/al/${i}.jpg` },
  dt: 180000,
  mv: 0,
}))

const FAKE_LYRICS: LyricLine[] = [
  { time: 0, text: '一行歌词' },
  { time: 5, text: '二行歌词' },
  { time: 10, text: '三行歌词' },
]

function makePlayerStore() {
  return {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    playSong: mockPlaySong,
    playQueue: mockPlayQueue,
    togglePlay: mockTogglePlay,
    seek: mockSeek,
  }
}

function makeLoadedData(overrides: Partial<{ simiSongs: Song[]; lyrics: LyricLine[] }> = {}) {
  return {
    song: FAKE_SONG,
    lyrics: overrides.lyrics ?? FAKE_LYRICS,
    simiSongs: overrides.simiSongs ?? FAKE_SIMI,
  }
}

function swrState<T>(overrides: Partial<{ data: T; isLoading: boolean }> = {}) {
  return {
    data: undefined as T | undefined,
    isLoading: false,
    error: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SongDetailPage', () => {
  beforeEach(() => {
    mockUseParams.mockReset()
    mockUseSWR.mockReset()
    mockUseParams.mockReturnValue({ id: '12345' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders the loading skeleton while SWR is fetching', async () => {
    mockUseSWR.mockReturnValue(swrState({ isLoading: true }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('song-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('song-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('song-hero')).not.toBeInTheDocument()
  })

  test('renders the error state when the song cannot be resolved', async () => {
    mockUseSWR.mockReturnValue(swrState({ data: { song: null, lyrics: [], simiSongs: [] } }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('song-error')).toBeInTheDocument()
    expect(screen.getByText('歌曲不存在或加载失败')).toBeInTheDocument()
    expect(screen.queryByTestId('song-page')).not.toBeInTheDocument()
  })

  test('renders the error state when SWR returns undefined data', async () => {
    mockUseSWR.mockReturnValue(swrState({ data: undefined }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    expect(screen.getByTestId('song-error')).toBeInTheDocument()
  })

  test('renders hero, actions, lyrics, comments, and similar songs when loaded', async () => {
    mockUseSWR.mockReturnValue(swrState({ data: makeLoadedData() }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    expect(screen.getByTestId('song-page')).toBeInTheDocument()
    expect(screen.getByTestId('song-hero')).toBeInTheDocument()
    expect(screen.getByTestId('song-actions')).toBeInTheDocument()
    expect(screen.getByTestId('song-lyrics')).toBeInTheDocument()
    expect(screen.getByTestId('lyrics-panel')).toHaveAttribute('data-lyric-count', '3')
    expect(screen.getByTestId('comment-list')).toHaveAttribute('data-resource-type', 'song')
    expect(screen.getByTestId('comment-list')).toHaveTextContent('12345')
    expect(screen.getByTestId('song-album-card')).toBeInTheDocument()
    expect(screen.getByTestId('song-similar')).toBeInTheDocument()

    // Hero carries the song title
    expect(screen.getByTestId('song-hero')).toHaveTextContent('夜曲')
  })

  test('caps similar songs at 10 entries', async () => {
    mockUseSWR.mockReturnValue(swrState({ data: makeLoadedData() }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    const cards = screen.getAllByTestId('song-similar-card')
    expect(cards.length).toBe(10)
  })

  test('omits the similar songs section when none are returned', async () => {
    mockUseSWR.mockReturnValue(
      swrState({ data: makeLoadedData({ simiSongs: [] }) })
    )

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    expect(screen.queryByTestId('song-similar')).not.toBeInTheDocument()
  })

  test('does not fetch when the id param is missing', async () => {
    mockUseParams.mockReturnValue({})
    mockUseSWR.mockReturnValue(swrState())

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    const firstCall = mockUseSWR.mock.calls[0]
    expect(firstCall?.[0]).toBeFalsy()
  })

  test('renders the album card linking to the album page', async () => {
    mockUseSWR.mockReturnValue(swrState({ data: makeLoadedData() }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    const albumLink = screen.getByTestId('song-album-card').closest('a')
    expect(albumLink).toHaveAttribute('href', '/album/999')
    expect(albumLink).toHaveTextContent('十一月的萧邦')
  })

  test('handles a song without album metadata gracefully', async () => {
    const songNoAlbum: Song = { ...FAKE_SONG, al: undefined }
    mockUseSWR.mockReturnValue(swrState({ data: { ...makeLoadedData(), song: songNoAlbum } }))

    const { default: SongPage } = await import('@/app/song/[id]/page')
    render(<SongPage />)

    expect(screen.getByTestId('song-page')).toBeInTheDocument()
    expect(screen.queryByTestId('song-album-card')).not.toBeInTheDocument()
  })
})

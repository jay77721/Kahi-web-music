'use client'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import React from 'react'
import type { Song } from '@/types/api'
import type { Artist } from '@/types/artist'
import type { Album } from '@/types/album'
import { ncmApi } from '@/lib/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseParams = vi.fn()
const mockUseSWR = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseDominantColor = vi.fn()
const ARTIST_PAGE_SOURCE = resolve(process.cwd(), 'app/artist/[id]/page.tsx')

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

vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: (...args: unknown[]) => mockUseDominantColor(...args),
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUsePlayerStore(selector) : (mockUsePlayerStore() ?? makePlayerStore()),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    artistDetail: vi.fn(),
    artistSongs: vi.fn(),
    artistAlbum: vi.fn(),
    artistDesc: vi.fn(),
    simiArtist: vi.fn(),
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/common/SongTable', () => ({
  SongTable: ({ songs }: { songs: { id: number; name: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'song-table' },
      `songs:${songs.length}`
    ),
}))

vi.mock('@/components/artist/ArtistHero', () => ({
  ArtistHero: ({
    artist,
    description,
    fanCount,
  }: {
    artist: Artist
    description?: string
    fanCount?: number
  }) =>
    React.createElement(
      'section',
      { 'data-testid': 'artist-hero' },
      React.createElement('h1', null, artist.name),
      fanCount !== undefined &&
        React.createElement('span', { 'data-testid': 'fan-count' }, `${fanCount}`),
      description &&
        React.createElement('p', { 'data-testid': 'artist-description' }, description)
    ),
}))

vi.mock('@/components/player/PlayerBar', () => ({ PlayerBar: () => null }))
vi.mock('@/components/player/PlayerOverlays', () => ({ PlayerOverlays: () => null }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_ARTIST: Artist = {
  id: 101,
  name: '周杰伦',
  picUrl: 'https://pics.example.com/artist/101.jpg',
  img1v1Url: 'https://pics.example.com/artist/101-1v1.jpg',
  alias: ['Jay Chou', '周董'],
  albumSize: 15,
  musicSize: 200,
  mvSize: 50,
}

const FAKE_SONGS: Song[] = Array.from({ length: 12 }, (_, i) => ({
  id: 1000 + i,
  name: `Song ${i + 1}`,
  ar: [{ id: 101, name: '周杰伦' }],
  al: { id: 1, name: 'Album 1', picUrl: 'https://pics.example.com/al.jpg' },
  dt: 180000,
  mv: 0,
  publishTime: 1057324800000,
  noCopyrightRcmd: null,
}))

const FAKE_ALBUMS: Album[] = Array.from({ length: 3 }, (_, i) => ({
  id: 2000 + i,
  name: `Album ${i + 1}`,
  picUrl: `https://pics.example.com/album/${2000 + i}.jpg`,
  publishTime: 1057324800000 + i * 86400000,
  artist: FAKE_ARTIST,
}))

const FAKE_SIMI: Artist[] = Array.from({ length: 3 }, (_, i) => ({
  id: 500 + i,
  name: `Similar ${i + 1}`,
  picUrl: `https://pics.example.com/artist/${500 + i}.jpg`,
}))

let restoreIdleCallbacks: (() => void) | null = null

type ArtistPrimaryData = {
  artist: Artist | null
  songs: Song[]
}

type ArtistDeferredData = {
  albums: Album[]
  desc: string
  simiArtists: Artist[]
}

type SwrMockState = {
  primary?: ArtistPrimaryData
  deferred?: ArtistDeferredData
  primaryLoading?: boolean
  deferredLoading?: boolean
  error?: unknown
}

function makePlayerStore() {
  return { playQueue: vi.fn() }
}

function makePrimaryData(overrides: Partial<ArtistPrimaryData> = {}): ArtistPrimaryData {
  return {
    artist: FAKE_ARTIST,
    songs: FAKE_SONGS,
    ...overrides,
  }
}

function makeDeferredData(overrides: Partial<ArtistDeferredData> = {}): ArtistDeferredData {
  return {
    albums: FAKE_ALBUMS,
    desc: '鍗庤娴佽闊充箰鏁欑埗',
    simiArtists: FAKE_SIMI,
    ...overrides,
  }
}

function makeLoadedData() {
  return {
    artist: FAKE_ARTIST,
    songs: FAKE_SONGS,
    albums: FAKE_ALBUMS,
    desc: '华语流行音乐教父',
    simiArtists: FAKE_SIMI,
  }
}

function stringifySWRKey(key: unknown): string {
  if (typeof key === 'string') return key
  if (key === null || key === undefined) return ''

  try {
    return JSON.stringify(key)
  } catch {
    return String(key)
  }
}

function isArtistKey(key: unknown, kind: 'primary' | 'deferred') {
  return typeof key === 'string' && key.startsWith(`artist-${kind}-`)
}

function findArtistSWRCall(kind: 'primary' | 'deferred') {
  return mockUseSWR.mock.calls.find(([key]) => isArtistKey(key, kind))
}

function mockArtistSWR({
  primary = makePrimaryData(),
  deferred = makeDeferredData({ desc: makeLoadedData().desc }),
  primaryLoading = false,
  deferredLoading = false,
  error,
}: SwrMockState = {}) {
  mockUseSWR.mockImplementation((key: unknown) => {
    if (!key) {
      return { data: undefined, isLoading: false, error: undefined }
    }

    if (isArtistKey(key, 'primary')) {
      return { data: primary, isLoading: primaryLoading, error }
    }

    if (isArtistKey(key, 'deferred')) {
      return {
        data: deferredLoading ? undefined : deferred,
        isLoading: deferredLoading,
        error,
      }
    }

    throw new Error(`Unexpected artist SWR key: ${stringifySWRKey(key)}`)
  })
}

function mockArtistApiResponses() {
  const desc = makeLoadedData().desc

  vi.mocked(ncmApi.artistDetail).mockResolvedValue({ artist: FAKE_ARTIST })
  vi.mocked(ncmApi.artistSongs).mockResolvedValue({ songs: FAKE_SONGS })
  vi.mocked(ncmApi.artistAlbum).mockResolvedValue({ hotAlbums: FAKE_ALBUMS })
  vi.mocked(ncmApi.artistDesc).mockResolvedValue({ briefDesc: desc })
  vi.mocked(ncmApi.simiArtist).mockResolvedValue({ artists: FAKE_SIMI })

  return desc
}

function clearArtistApiMocks() {
  vi.mocked(ncmApi.artistDetail).mockClear()
  vi.mocked(ncmApi.artistSongs).mockClear()
  vi.mocked(ncmApi.artistAlbum).mockClear()
  vi.mocked(ncmApi.artistDesc).mockClear()
  vi.mocked(ncmApi.simiArtist).mockClear()
}

function restoreWindowProperty(
  key: 'requestIdleCallback' | 'cancelIdleCallback',
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) {
    Object.defineProperty(window, key, descriptor)
    return
  }

  Reflect.deleteProperty(window, key)
}

function installIdleCallbackMock() {
  const requestIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback')
  const cancelIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback')
  const callbacks = new Map<number, IdleRequestCallback>()
  let nextId = 1

  const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
    const id = nextId
    nextId += 1
    callbacks.set(id, callback)
    return id
  })
  const cancelIdleCallback = vi.fn((id: number) => {
    callbacks.delete(id)
  })

  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    writable: true,
    value: requestIdleCallback,
  })
  Object.defineProperty(window, 'cancelIdleCallback', {
    configurable: true,
    writable: true,
    value: cancelIdleCallback,
  })

  restoreIdleCallbacks = () => {
    restoreWindowProperty('requestIdleCallback', requestIdleDescriptor)
    restoreWindowProperty('cancelIdleCallback', cancelIdleDescriptor)
  }

  return {
    requestIdleCallback,
    cancelIdleCallback,
    pendingCount: () => callbacks.size,
    flushNext: async () => {
      const next = callbacks.entries().next().value
      if (!next) {
        throw new Error('Expected a pending requestIdleCallback')
      }

      const [id, callback] = next
      callbacks.delete(id)
      await act(async () => {
        callback({
          didTimeout: false,
          timeRemaining: () => 50,
        })
        await Promise.resolve()
      })
    },
  }
}

async function flushDeferredArtistRequest() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(900)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArtistPage', () => {
  beforeEach(() => {
    mockUseParams.mockReset()
    mockUseSWR.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseDominantColor.mockReset()

    mockUseParams.mockReturnValue({ id: '101' })
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    mockUsePlayerStore.mockImplementation((selector) =>
      selector
        ? selector(makePlayerStore() as unknown as Record<string, unknown>)
        : makePlayerStore()
    )
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    })
  })

  afterEach(() => {
    cleanup()
    restoreIdleCallbacks?.()
    restoreIdleCallbacks = null
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('does not import framer-motion in the artist page runtime', () => {
    const source = readFileSync(ARTIST_PAGE_SOURCE, 'utf8')

    expect(source).not.toMatch(/from ['"]framer-motion['"]/)
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toContain('motion.')
  })

  test('renders the loading skeleton while SWR is fetching', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    })

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('artist-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('artist-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('artist-hero')).not.toBeInTheDocument()
  })

  test('renders the not-found state when the artist is missing', async () => {
    mockArtistSWR({
      primary: makePrimaryData({ artist: null, songs: [] }),
      deferred: makeDeferredData({ albums: [], desc: '', simiArtists: [] }),
    })

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('artist-not-found')).toBeInTheDocument()
    expect(screen.getByText('歌手不存在')).toBeInTheDocument()
    expect(screen.queryByTestId('artist-hero')).not.toBeInTheDocument()
  })

  test('renders hero, stats, hot songs, albums, and similar artists when loaded', async () => {
    vi.useFakeTimers()
    mockArtistSWR()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    // Shell + page
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('artist-page')).toBeInTheDocument()

    // Hero shows the artist name
    expect(screen.getByTestId('artist-hero')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '周杰伦' })).toBeInTheDocument()

    expect(screen.queryByTestId('artist-description')).not.toBeInTheDocument()
    expect(findArtistSWRCall('deferred')).toBeUndefined()

    await flushDeferredArtistRequest()
    expect(findArtistSWRCall('deferred')).toBeDefined()

    // Description is passed through
    expect(screen.getByTestId('artist-description')).toHaveTextContent('华语流行音乐教父')

    // Stats labels (4 bento tiles)
    expect(screen.getByText('SONGS')).toBeInTheDocument()
    expect(screen.getByText('ALBUMS')).toBeInTheDocument()
    expect(screen.getByText('MVS')).toBeInTheDocument()
    expect(screen.getByText('FANS')).toBeInTheDocument()

    // Section headers
    expect(screen.getByText('热门歌曲')).toBeInTheDocument()
    expect(screen.getByText('专辑')).toBeInTheDocument()
    expect(screen.getByText('相似艺人')).toBeInTheDocument()

    // Song table receives the first 10 songs
    const table = screen.getByTestId('song-table')
    expect(table).toHaveTextContent('songs:10')

    // Albums rendered as links to /album/{id}
    const albumLinks = screen.getAllByRole('link', { name: /Album \d/ })
    expect(albumLinks.length).toBe(3)
    expect(albumLinks[0]).toHaveAttribute('href', '/album/2000')

    // Similar artists rendered
    const simiLinks = screen.getAllByRole('link', { name: /Similar \d/ })
    expect(simiLinks.length).toBe(3)
    expect(simiLinks[0]).toHaveAttribute('href', '/artist/500')

    // Play-all button
    expect(screen.getByTestId('play-all')).toBeInTheDocument()
  })

  test('truncates the hot songs list to 10 entries even when more are loaded', async () => {
    mockArtistSWR()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    expect(screen.getByTestId('song-table')).toHaveTextContent('songs:10')
  })

  test('starts deferred artist data after requestIdleCallback fires', async () => {
    const idleMock = installIdleCallbackMock()
    mockArtistSWR()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    expect(idleMock.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 1800,
    })
    expect(findArtistSWRCall('deferred')).toBeUndefined()

    await idleMock.flushNext()

    expect(findArtistSWRCall('deferred')).toBeDefined()
    expect(screen.getByTestId('artist-description')).toHaveTextContent(makeLoadedData().desc)
  })

  test('cancels a scheduled deferred request when the page unmounts', async () => {
    const idleMock = installIdleCallbackMock()
    mockArtistSWR()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    const { unmount } = render(<ArtistPage />)

    expect(idleMock.pendingCount()).toBe(1)
    unmount()

    expect(idleMock.cancelIdleCallback).toHaveBeenCalledWith(1)
    expect(idleMock.pendingCount()).toBe(0)
    expect(findArtistSWRCall('deferred')).toBeUndefined()
  })

  test('play-all button calls playQueue with the first 10 hot songs', async () => {
    const playQueue = vi.fn()
    mockUsePlayerStore.mockImplementation((selector) =>
      selector
        ? selector({ playQueue } as unknown as Record<string, unknown>)
        : { playQueue }
    )
    mockArtistSWR()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    fireEvent.click(screen.getByTestId('play-all'))
    expect(playQueue).toHaveBeenCalledTimes(1)
    const [passed, idx] = playQueue.mock.calls[0] as [Song[], number]
    expect(passed.length).toBe(10)
    expect(idx).toBe(0)
  })

  test('omits the albums and similar artists sections when no data is available', async () => {
    mockArtistSWR({
      primary: makePrimaryData({ songs: FAKE_SONGS.slice(0, 10) }),
      deferred: makeDeferredData({ albums: [], desc: '', simiArtists: [] }),
    })

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    expect(screen.queryByText('专辑')).not.toBeInTheDocument()
    expect(screen.queryByText('相似艺人')).not.toBeInTheDocument()
    // The empty hint only shows if everything is empty
    expect(screen.getByTestId('song-table')).toBeInTheDocument()
  })

  test('shows the empty hint when there is no content at all', async () => {
    vi.useFakeTimers()
    mockArtistSWR({
      primary: makePrimaryData({ songs: [] }),
      deferred: makeDeferredData({ albums: [], desc: '', simiArtists: [] }),
    })

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    expect(screen.queryByText('暂无内容')).not.toBeInTheDocument()

    await flushDeferredArtistRequest()

    expect(screen.getByText('暂无内容')).toBeInTheDocument()
  })

  test('keeps the empty hint hidden while deferred content is still loading', async () => {
    vi.useFakeTimers()
    mockArtistSWR({
      primary: makePrimaryData({ songs: [] }),
      deferredLoading: true,
    })

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    await flushDeferredArtistRequest()

    expect(findArtistSWRCall('deferred')).toBeDefined()
    expect(screen.queryByText('\u6682\u65e0\u5185\u5bb9')).not.toBeInTheDocument()
  })

  test('does not call SWR when id is missing from the route params', async () => {
    mockUseParams.mockReturnValue({})

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    // The first arg of SWR is the key. Null/undefined keys tell SWR to skip fetching.
    expect(mockUseSWR.mock.calls.length).toBeGreaterThan(0)
    expect(mockUseSWR.mock.calls.every(([key]) => !key)).toBe(true)
  })

  test('uses a primary SWR key that only fetches artist detail and hot songs', async () => {
    mockArtistSWR()
    mockArtistApiResponses()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)

    const primaryCall = findArtistSWRCall('primary')
    expect(primaryCall).toBeDefined()
    expect(stringifySWRKey(primaryCall?.[0])).toContain('101')

    if (!primaryCall || typeof primaryCall[1] !== 'function') {
      throw new Error('Expected artist primary SWR call to include a fetcher')
    }

    clearArtistApiMocks()
    const primaryData = (await primaryCall[1]()) as Partial<ArtistPrimaryData>

    expect(ncmApi.artistDetail).toHaveBeenCalledWith('101')
    expect(ncmApi.artistSongs).toHaveBeenCalledWith('101', 10)
    expect(ncmApi.artistAlbum).not.toHaveBeenCalled()
    expect(ncmApi.artistDesc).not.toHaveBeenCalled()
    expect(ncmApi.simiArtist).not.toHaveBeenCalled()
    expect(primaryData.artist).toEqual(FAKE_ARTIST)
    expect(primaryData.songs).toEqual(FAKE_SONGS)
  })

  test('uses a deferred SWR key that fetches albums, description, and similar artists', async () => {
    vi.useFakeTimers()
    mockArtistSWR()
    const desc = mockArtistApiResponses()

    const { default: ArtistPage } = await import('@/app/artist/[id]/page')
    render(<ArtistPage />)
    await flushDeferredArtistRequest()

    const deferredCall = findArtistSWRCall('deferred')
    expect(deferredCall).toBeDefined()
    expect(stringifySWRKey(deferredCall?.[0])).toContain('101')

    if (!deferredCall || typeof deferredCall[1] !== 'function') {
      throw new Error('Expected artist deferred SWR call to include a fetcher')
    }

    clearArtistApiMocks()
    const deferredData = (await deferredCall[1]()) as Partial<ArtistDeferredData>

    expect(ncmApi.artistDetail).not.toHaveBeenCalled()
    expect(ncmApi.artistSongs).not.toHaveBeenCalled()
    expect(ncmApi.artistAlbum).toHaveBeenCalledWith('101', 12)
    expect(ncmApi.artistDesc).toHaveBeenCalledWith('101')
    expect(ncmApi.simiArtist).toHaveBeenCalledWith('101')
    expect(deferredData.albums).toEqual(FAKE_ALBUMS)
    expect(deferredData.desc).toBe(desc)
    expect(deferredData.simiArtists).toEqual(FAKE_SIMI)
  })
})

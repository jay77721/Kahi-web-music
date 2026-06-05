'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import type { NormalizedPlaylistDetail } from '@/lib/api-adapters'
import type { Playlist } from '@/types/playlist'
import type { Song } from '@/types/song'

type SongTableMockProps = {
  songs: Song[]
  animated?: boolean
  initialArtworkCount?: number
  selectable?: boolean
  selectedIds?: ReadonlySet<string>
  onPlayAll?: () => void | Promise<void>
}

const mockUseParams = vi.hoisted(() => vi.fn())
const mockUseSWR = vi.hoisted(() => vi.fn())
const mockMutate = vi.hoisted(() => vi.fn())
const mockUsePlayerStore = vi.hoisted(() => vi.fn())
const songTableProps = vi.hoisted(() => [] as SongTableMockProps[])
const mockNcmApi = vi.hoisted(() => ({
  playlistDetail: vi.fn(),
  playlistTrackAll: vi.fn(),
}))
const mockToast = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

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

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/lib/api', () => ({
  ncmApi: mockNcmApi,
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: () => mockUsePlayerStore(),
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/common/SongTable', () => ({
  SongTable: (props: SongTableMockProps) => {
    songTableProps.push(props)

    return React.createElement(
      'div',
      {
        'data-testid': 'song-table',
        'data-animated': String(props.animated),
        'data-selectable': String(props.selectable),
      },
      `songs:${props.songs.length}`,
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'song-table-play-all',
          onClick: () => void props.onPlayAll?.(),
        },
        'table play all'
      )
    )
  },
}))

vi.mock('@/components/common/BatchActionBar', () => ({
  BatchActionBar: ({ selectedCount }: { selectedCount: number }) =>
    React.createElement('div', { 'data-testid': 'batch-action-bar' }, `${selectedCount}`),
}))

vi.mock('@/components/common/Tag', () => ({
  Tag: ({ label }: { label: string }) =>
    React.createElement('span', { 'data-testid': 'playlist-tag' }, label),
}))

vi.mock('@/components/common/ShareMenu', () => ({
  ShareMenu: () => React.createElement('button', { type: 'button' }, '分享'),
}))

vi.mock('@/components/playlist/HeroBanner', () => ({
  HeroBanner: ({
    title,
    meta,
    actions,
  }: {
    title: string
    meta: { count?: number }
    actions?: React.ReactNode
  }) =>
    React.createElement(
      'section',
      { 'data-testid': 'hero-banner' },
      React.createElement('h1', null, title),
      React.createElement('span', { 'data-testid': 'hero-track-count' }, `${meta.count ?? ''}`),
      React.createElement('div', null, actions)
    ),
}))

vi.mock('@/components/playlist/MetadataBento', () => ({
  MetadataBento: ({
    items,
  }: {
    items: Array<{ label: string; value: React.ReactNode }>
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'metadata-bento' },
      items.map((item) =>
        React.createElement(
          'span',
          { key: item.label, 'data-testid': `metadata-${item.label}` },
          item.value
        )
      )
    ),
}))

function makeSong(id: number): Song {
  return {
    id,
    name: `Song ${id}`,
    ar: [{ id, name: `Artist ${id}` }],
    al: { id, name: `Album ${id}`, picUrl: `https://example.com/${id}.jpg` },
    dt: 180000,
    mv: 0,
    publishTime: 0,
    noCopyrightRcmd: null,
  }
}

function makeSongs(count: number): Song[] {
  return Array.from({ length: count }, (_, index) => makeSong(index + 1))
}

function makePlaylist(trackCount = 100): Playlist {
  return {
    id: 1,
    name: 'Smoke Playlist',
    coverImgUrl: 'https://example.com/cover.jpg',
    creator: {
      userId: 101,
      nickname: 'Playlist Owner',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    description: 'playlist description',
    tracks: makeSongs(trackCount),
    trackCount,
    playCount: 12345,
    subscribedCount: 8,
    createTime: 1700000000000,
    updateTime: 1700000000000,
    tags: ['pop'],
  }
}

function makeLoadedData(loadedCount = 30, trackCount = 100): NormalizedPlaylistDetail {
  return {
    playlist: makePlaylist(trackCount),
    tracks: makeSongs(loadedCount),
  }
}

function latestSongTableProps() {
  return songTableProps[songTableProps.length - 1]
}

async function renderPlaylistPage() {
  const { default: PlaylistDetailPage } = await import('@/app/playlist/[id]/page')
  render(<PlaylistDetailPage />)
}

describe('PlaylistDetailPage', () => {
  beforeEach(() => {
    mockUseParams.mockReset()
    mockUseSWR.mockReset()
    mockMutate.mockReset()
    mockUsePlayerStore.mockReset()
    mockNcmApi.playlistDetail.mockReset()
    mockNcmApi.playlistTrackAll.mockReset()
    mockToast.info.mockReset()
    mockToast.success.mockReset()
    mockToast.error.mockReset()
    songTableProps.length = 0

    mockUseParams.mockReturnValue({ id: '1' })
    mockMutate.mockResolvedValue(undefined)
    mockUsePlayerStore.mockReturnValue({ playQueue: vi.fn() })
    mockUseSWR.mockReturnValue({
      data: makeLoadedData(),
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('uses tracks from playlist detail without requesting the track/all fallback', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })
    mockNcmApi.playlistDetail.mockResolvedValue({ playlist: makePlaylist(120) })

    await renderPlaylistPage()

    expect(mockUseSWR.mock.calls[0]?.[0]).toBe('playlist-detail-1')
    const fetcher = mockUseSWR.mock.calls[0]?.[1] as () => Promise<NormalizedPlaylistDetail>
    const result = await fetcher()

    expect(mockNcmApi.playlistDetail).toHaveBeenCalledWith('1')
    expect(mockNcmApi.playlistTrackAll).not.toHaveBeenCalled()
    expect(result.tracks).toHaveLength(30)
  })

  test('requests the initial track/all fallback when playlist detail has no tracks', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })
    const playlistWithoutTracks = { ...makePlaylist(120), tracks: [] }
    mockNcmApi.playlistDetail.mockResolvedValue({ playlist: playlistWithoutTracks })
    mockNcmApi.playlistTrackAll.mockResolvedValue({ songs: makeSongs(100) })

    await renderPlaylistPage()

    expect(mockUseSWR.mock.calls[0]?.[0]).toBe('playlist-detail-1')
    const fetcher = mockUseSWR.mock.calls[0]?.[1] as () => Promise<NormalizedPlaylistDetail>
    const result = await fetcher()

    expect(mockNcmApi.playlistDetail).toHaveBeenCalledWith('1')
    expect(mockNcmApi.playlistTrackAll).toHaveBeenCalledWith('1', 30)
    expect(result.tracks).toHaveLength(30)
  })

  test('renders the first 30 tracks while keeping hero metadata on the full count', async () => {
    await renderPlaylistPage()

    const table = screen.getByTestId('song-table')
    expect(table).toHaveTextContent('songs:30')
    expect(table).toHaveAttribute('data-animated', 'false')
    expect(latestSongTableProps()?.initialArtworkCount).toBe(8)
    expect(screen.getByTestId('playlist-track-summary')).toHaveTextContent('已显示 30 / 100 首')
    expect(screen.getByTestId('playlist-load-full')).toHaveTextContent('加载完整前 100')
    expect(screen.getByTestId('hero-track-count')).toHaveTextContent('100')
    expect(screen.getByTestId('metadata-TRACKS')).toHaveTextContent('100')
  })

  test('loads the complete first 100 tracks on demand', async () => {
    const fullSongs = makeSongs(100)
    mockNcmApi.playlistTrackAll.mockResolvedValue({ songs: fullSongs })

    await renderPlaylistPage()
    fireEvent.click(screen.getByTestId('playlist-load-full'))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1)
    })
    expect(mockNcmApi.playlistTrackAll).toHaveBeenCalledWith('1', 100)

    const [nextData, options] = mockMutate.mock.calls[0] as [
      NormalizedPlaylistDetail,
      { revalidate: boolean },
    ]
    expect(nextData.tracks).toHaveLength(100)
    expect(nextData.tracks.map((song) => song.id)).toEqual(fullSongs.map((song) => song.id))
    expect(options).toEqual({ revalidate: false })
  })

  test('play all fetches the first 100 tracks before starting the queue', async () => {
    const playQueue = vi.fn()
    const fullSongs = makeSongs(100)
    mockUsePlayerStore.mockReturnValue({ playQueue })
    mockNcmApi.playlistTrackAll.mockResolvedValue({ songs: fullSongs })

    await renderPlaylistPage()
    fireEvent.click(screen.getByRole('button', { name: /播放全部/ }))

    await waitFor(() => {
      expect(playQueue).toHaveBeenCalledTimes(1)
    })
    expect(mockNcmApi.playlistTrackAll).toHaveBeenCalledWith('1', 100)

    const [queue, startIndex] = playQueue.mock.calls[0] as [Song[], number]
    expect(queue).toHaveLength(100)
    expect(queue.map((song) => song.id)).toEqual(fullSongs.map((song) => song.id))
    expect(startIndex).toBe(0)
  })

  test('batch mode still operates on the currently rendered slice', async () => {
    await renderPlaylistPage()

    fireEvent.click(screen.getByTestId('batch-mode-toggle'))

    expect(latestSongTableProps()?.selectable).toBe(true)
    expect(latestSongTableProps()?.songs).toHaveLength(30)
    expect(latestSongTableProps()?.selectedIds?.size).toBe(0)
  })
})

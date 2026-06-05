import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Song } from '@/types/api'

const mockSongDetail = vi.fn()

vi.mock('@/lib/api', () => ({
  ncmApi: {
    songDetail: (...args: unknown[]) => mockSongDetail(...args),
  },
}))

function makeSong(id: number): Song {
  return {
    id,
    name: `Song ${id}`,
    ar: [{ id: id + 10_000, name: `Artist ${id}` }],
    al: { id: id + 20_000, name: `Album ${id}`, picUrl: '' },
    dt: 180_000,
    publishTime: 0,
    noCopyrightRcmd: null,
    mv: 0,
  }
}

describe('fetchSongDetailsByIds', () => {
  beforeEach(() => {
    mockSongDetail.mockReset()
  })

  test('fetches all IDs in 100-song batches and preserves liked order', async () => {
    const { fetchSongDetailsByIds } = await import('@/lib/song-details')
    const ids = Array.from({ length: 250 }, (_, index) => index + 1)

    mockSongDetail.mockImplementation(async (idParam: string) => {
      const batchIds = idParam.split(',').map(Number)
      return { songs: batchIds.map(makeSong).reverse() }
    })

    const songs = await fetchSongDetailsByIds(ids)

    expect(mockSongDetail).toHaveBeenCalledTimes(3)
    expect(mockSongDetail).toHaveBeenNthCalledWith(1, ids.slice(0, 100).join(','))
    expect(mockSongDetail).toHaveBeenNthCalledWith(2, ids.slice(100, 200).join(','))
    expect(mockSongDetail).toHaveBeenNthCalledWith(3, ids.slice(200).join(','))
    expect(songs).toHaveLength(250)
    expect(songs.map((song) => song.id)).toEqual(ids)
  })

  test('deduplicates repeated IDs before fetching details', async () => {
    const { fetchSongDetailsByIds } = await import('@/lib/song-details')

    mockSongDetail.mockResolvedValue({ songs: [makeSong(1), makeSong(2), makeSong(3)] })

    const songs = await fetchSongDetailsByIds([1, 2, 2, 3, 1])

    expect(mockSongDetail).toHaveBeenCalledWith('1,2,3')
    expect(songs.map((song) => song.id)).toEqual([1, 2, 3])
  })
})

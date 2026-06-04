import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import ncmApi, { unwrapField } from '@/lib/api'
import type { Song, SearchResponse } from '@/types/api'
import type { Playlist } from '@/types/playlist'
import { mockSong } from '@/tests/helpers/mock-data'

// Provide minimal window.location for URL construction
const originalWindow = global.window
const originalFetch = global.fetch

beforeEach(() => {
  Object.defineProperty(global, 'window', {
    value: { ...originalWindow, location: { origin: 'http://localhost:3000' } },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true })
  global.fetch = originalFetch
})

function createMockFetchResponse<T>(data: T, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    url: 'http://localhost:3000/api/test',
    type: 'basic',
    redirected: false,
    body: null,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    clone: () => createMockFetchResponse(data, ok, status),
  } as unknown as Response
}

describe('NcmApiClient', () => {
  beforeEach(() => {
    ncmApi.clearCache()
  })

  describe('request()', () => {
    test('serializes params as query string', async () => {
      const mockResponse = { code: 200, data: { id: 1, name: 'test' } as unknown as Song }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse))

      const result = await ncmApi.request('/test', { id: 1, name: 'hello', count: 5 })

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(calledUrl).toContain('id=1')
      expect(calledUrl).toContain('name=hello')
      expect(calledUrl).toContain('count=5')
      expect(result).toEqual({ id: 1, name: 'test' })
    })

    test('skips undefined and null params', async () => {
      const mockResponse = { code: 200, data: { result: [] } }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse))

      await ncmApi.request('/test', {
        id: 1,
        name: undefined as unknown as string,
        desc: null as string | null,
        active: true,
      })

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(calledUrl).toContain('id=1')
      expect(calledUrl).toContain('active=true')
      expect(calledUrl).not.toContain('name=')
      expect(calledUrl).not.toContain('desc=')
    })

    test('caches results within TTL', async () => {
      const mockResponse = { code: 200, data: { cached: true } }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse))

      const firstCall = await ncmApi.request('/test', { id: 1 })
      const secondCall = await ncmApi.request('/test', { id: 1 })

      expect(firstCall).toEqual({ cached: true })
      expect(secondCall).toEqual({ cached: true })
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    test('bypasses cache with skipCache=true', async () => {
      const mockResponse1 = { code: 200, data: { attempt: 1 } }
      const mockResponse2 = { code: 200, data: { attempt: 2 } }

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockFetchResponse(mockResponse1))
        .mockResolvedValueOnce(createMockFetchResponse(mockResponse2))

      const firstCall = await ncmApi.request('/test', { id: 1 })
      const secondCall = await ncmApi.request('/test', { id: 1 }, true)

      expect(firstCall).toEqual({ attempt: 1 })
      expect(secondCall).toEqual({ attempt: 2 })
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    test('deduplicates same request in same tick', async () => {
      const mockResponse = { code: 200, data: { deduped: true } }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse))

      const [result1, result2] = await Promise.all([
        ncmApi.request('/test', { id: 1 }),
        ncmApi.request('/test', { id: 1 }),
      ])

      expect(result1).toEqual({ deduped: true })
      expect(result2).toEqual({ deduped: true })
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    test('throws on non-ok HTTP response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({ code: 404, message: 'Not Found' }, false, 404)
      )

      await expect(ncmApi.request('/test', { id: 1 })).rejects.toThrow(
        'API Error: 404 Not Found'
      )
    })

    test('throws when API returns non-200 code', async () => {
      const errorResponse = { code: 500, message: 'Internal Server Error' }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(errorResponse))

      await expect(ncmApi.request('/test', { id: 1 })).rejects.toThrow(
        'Internal Server Error'
      )
    })

    test('returns data when API wraps response in data field', async () => {
      const wrappedResponse = { code: 200, data: { songs: [{ id: 1, name: 'Song A' }] } }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(wrappedResponse))

      const result = await ncmApi.request('/test', { id: 1 })
      expect(result).toEqual({ songs: [{ id: 1, name: 'Song A' }] })
    })
  })

  describe('requestFlexible()', () => {
    test('returns { code: status } on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({ error: 'bad' }, false, 503)
      )

      const result = await ncmApi.requestFlexible<{ code: number }>('/test', { id: 1 })
      expect(result).toEqual({ code: 503 })
    })

    test('returns data when API wraps response in data field', async () => {
      const wrappedResponse = { code: 200, data: { polls: [{ status: 'waiting' }] } }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(wrappedResponse))

      const result = await ncmApi.requestFlexible<{ polls: unknown[] }>('/qr/check', { key: 'abc' })
      expect(result).toEqual({ polls: [{ status: 'waiting' }] })
    })

    test('does not cache results', async () => {
      const mockResponse1 = { code: 200, data: { call: 1 } }
      const mockResponse2 = { code: 200, data: { call: 2 } }

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockFetchResponse(mockResponse1))
        .mockResolvedValueOnce(createMockFetchResponse(mockResponse2))

      const first = await ncmApi.requestFlexible('/test', { id: 1 })
      const second = await ncmApi.requestFlexible('/test', { id: 1 })

      expect(first).toEqual({ call: 1 })
      expect(second).toEqual({ call: 2 })
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearCache()', () => {
    test('empties both cache and pending requests', async () => {
      const mockResponse = { code: 200, data: { cleared: true } }
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockResponse))

      await ncmApi.request('/test', { id: 1 })
      ncmApi.clearCache()
      await ncmApi.request('/test', { id: 1 })

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('convenience methods', () => {
    test('banner() calls correct endpoint', async () => {
      const mockBanners = [{ imageUrl: 'https://example.com/banner.jpg', targetId: 1, typeTitle: '推荐' }]
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse({ code: 200, banners: mockBanners }))

      const result = await ncmApi.banner(1)

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(calledUrl).toContain('/api/banner?type=1')
      expect(result).toEqual(mockBanners)
    })

    test('search() calls correct endpoint with query params', async () => {
      const mockSearchResult = {
        code: 200,
        result: {
          songs: { songCount: 2, songs: [mockSong, mockSong] },
          playlists: { playlistCount: 5, playlists: [] },
        },
      } as unknown as SearchResponse
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(mockSearchResult))

      const result = await ncmApi.search('周杰伦', 1, 30, 0)

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(calledUrl).toContain('/api/search')
      expect(calledUrl).toContain('keywords=')
      expect(calledUrl).toContain('type=1')
      expect(calledUrl).toContain('limit=30')
      expect(calledUrl).toContain('offset=0')
      expect(result).toEqual(mockSearchResult)
    })

    test('playlistDetail() calls correct endpoint', async () => {
      const mockPlaylist: Playlist = {
        id: 3001,
        name: 'Test Playlist',
        coverImgUrl: 'https://example.com/cover.jpg',
        creator: { userId: 1, nickname: 'Test User', avatarUrl: '' },
        trackCount: 10,
        playCount: 1000,
        subscribedCount: 50,
        createTime: Date.now(),
        updateTime: Date.now(),
      }
      // The NCM backend returns the playlist at the top level (Pattern B).
      global.fetch = vi.fn().mockResolvedValue(
        createMockFetchResponse({ code: 200, playlist: mockPlaylist, privileges: [] })
      )

      const result = await ncmApi.playlistDetail(3001)

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(calledUrl).toContain('/api/playlist/detail')
      expect(calledUrl).toContain('id=3001')
      expect(unwrapField<Playlist>(result, 'playlist')).toEqual(mockPlaylist)
    })

    test('songUrl() calls correct endpoint with id and br params', async () => {
      const mockSongUrls = [{ id: 1001, url: 'https://example.com/song.mp3', br: 320000, size: 5000000 }]
      global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse({ code: 200, data: mockSongUrls }))

      const result = await ncmApi.songUrl(1001, 320000)

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(calledUrl).toContain('/api/song/url')
      expect(calledUrl).toContain('id=1001')
      expect(calledUrl).toContain('br=320000')
      expect(result).toEqual(mockSongUrls)
    })
  })

  describe('unwrapField()', () => {
    test('returns field when present at the top level (Pattern B)', () => {
      const raw = { code: 200, songs: [mockSong], privileges: [] }
      expect(unwrapField<Song[]>(raw, 'songs')).toEqual([mockSong])
    })

    test('returns field inside the inner data object (Pattern A)', () => {
      const raw = { code: 200, data: { playlist: { id: 1, name: 'Mix' } } }
      expect(unwrapField<{ id: number; name: string }>(raw, 'playlist')).toEqual({
        id: 1,
        name: 'Mix',
      })
    })

    test('returns undefined when the field is absent in either layer', () => {
      expect(unwrapField<unknown>({ code: 200 }, 'songs')).toBeUndefined()
      expect(unwrapField<unknown>({ code: 200, data: {} }, 'songs')).toBeUndefined()
    })

    test('returns undefined for null / undefined / non-object input', () => {
      expect(unwrapField<unknown>(null, 'x')).toBeUndefined()
      expect(unwrapField<unknown>(undefined, 'x')).toBeUndefined()
      expect(unwrapField<unknown>(42, 'x')).toBeUndefined()
    })
  })
})

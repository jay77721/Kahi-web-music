import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/song/stream/route'

const originalApiUrl = process.env.API_URL
const originalAllowedHosts = process.env.AUDIO_URL_ALLOWED_HOSTS
const originalFetch = global.fetch

function createRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init))
}

function mockUrlResponse(audioUrl: string): Response {
  return new Response(JSON.stringify({ data: [{ url: audioUrl }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('song stream route hardening', () => {
  beforeEach(() => {
    process.env.API_URL = 'https://api.example.test'
    process.env.AUDIO_URL_ALLOWED_HOSTS = 'cdn.example.test'
  })

  afterEach(() => {
    process.env.API_URL = originalApiUrl
    process.env.AUDIO_URL_ALLOWED_HOSTS = originalAllowedHosts
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  test('rejects missing song id', async () => {
    const response = await GET(createRequest('https://app.example.test/api/song/stream'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ message: 'Invalid song id' })
  })

  test('rejects invalid bitrate', async () => {
    const response = await GET(
      createRequest('https://app.example.test/api/song/stream?id=123&br=1'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ message: 'Invalid bitrate' })
  })

  test('rejects invalid audio URL protocol', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockUrlResponse('file:///etc/passwd'))

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ message: 'Audio URL not available' })
  })

  test('rejects invalid audio URL host', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockUrlResponse('https://evil.example.test/a.mp3'))

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ message: 'Audio URL not available' })
  })

  test('proxies range requests with 206 status', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockUrlResponse('https://cdn.example.test/a.mp3'))
      .mockResolvedValueOnce(
        new Response('audio-bytes', {
          status: 206,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': '10',
            'Content-Range': 'bytes 0-9/100',
          },
        }),
      )

    const response = await GET(
      createRequest('https://app.example.test/api/song/stream?id=123', {
        headers: { Range: 'bytes=0-9' },
      }),
    )

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 0-9/100')
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
  })

  test('returns 502 when CDN returns non-audio content', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockUrlResponse('https://cdn.example.test/a.mp3'))
      .mockResolvedValueOnce(
        new Response('<html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      )

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      message: 'Upstream response is not audio',
    })
  })
})

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/song/stream/route'

const originalApiUrl = process.env.API_URL
const originalAllowedHosts = process.env.AUDIO_URL_ALLOWED_HOSTS
const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
const originalFetch = global.fetch
let requestCounter = 0

function createRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers)
  if (!headers.has('x-vercel-forwarded-for')) {
    requestCounter += 1
    headers.set('x-vercel-forwarded-for', `203.0.113.${requestCounter}`)
  }

  return new NextRequest(new Request(url, { ...init, headers }))
}

function createRequestWithoutTrustedIp(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers)
  headers.delete('x-vercel-forwarded-for')

  return new NextRequest(new Request(url, { ...init, headers }))
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
    delete process.env.ALLOWED_ORIGINS
  })

  afterEach(() => {
    process.env.API_URL = originalApiUrl
    process.env.AUDIO_URL_ALLOWED_HOSTS = originalAllowedHosts
    process.env.ALLOWED_ORIGINS = originalAllowedOrigins
    vi.unstubAllEnvs()
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

  test('adds CORS headers to JSON error responses for allowed origins', async () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.test'

    const response = await GET(
      createRequest('https://app.example.test/api/song/stream', {
        headers: { Origin: 'https://allowed.example.test' },
      }),
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://allowed.example.test',
    )
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  test('returns configuration error without fetching localhost when production API_URL is missing', async () => {
    process.env.API_URL = ''
    vi.stubEnv('NODE_ENV', 'production')
    global.fetch = vi.fn()

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ message: 'API_URL is not configured' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('rejects malformed range headers before upstream fetches', async () => {
    global.fetch = vi.fn()

    const response = await GET(
      createRequest('https://app.example.test/api/song/stream?id=123', {
        headers: { Range: 'bytes=0-9,20-29' },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ message: 'Invalid range header' })
    expect(global.fetch).not.toHaveBeenCalled()
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

  test('normalizes generic octet-stream CDN responses to a browser-playable audio MIME type', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockUrlResponse('https://cdn.example.test/a.mp3'))
      .mockResolvedValueOnce(
        new Response('audio-bytes', {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': '10',
          },
        }),
      )

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Encoding')).toBe('identity')
    await expect(response.text()).resolves.toBe('audio-bytes')
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/song\/url\?id=123&br=320000$/),
      expect.objectContaining({ headers: expect.any(Object) }),
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://cdn.example.test/a.mp3',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  test('returns 504 when metadata fetch is aborted', async () => {
    const abortError = Object.assign(new Error('metadata fetch aborted'), { name: 'AbortError' })
    global.fetch = vi.fn().mockRejectedValueOnce(abortError)

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toMatchObject({
      message: 'Stream request timeout',
    })
  })

  test('returns 504 when audio fetch is aborted', async () => {
    const abortError = Object.assign(new Error('audio fetch aborted'), { name: 'AbortError' })
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockUrlResponse('https://cdn.example.test/a.mp3'))
      .mockRejectedValueOnce(abortError)

    const response = await GET(createRequest('https://app.example.test/api/song/stream?id=123'))

    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toMatchObject({
      message: 'Stream request timeout',
    })
  })

  test('uses allowlisted outbound headers for metadata and audio fetches', async () => {
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
        headers: {
          Cookie: 'app_session=app; MUSIC_U=session-token; theme=dark; __csrf=csrf-token; next-auth.session-token=auth',
          Range: 'bytes=0-9',
          'User-Agent': 'KahiTest/1.0',
          'X-Forwarded-For': '198.51.100.10',
          'X-Real-IP': '198.51.100.11',
        },
      }),
    )

    expect(response.status).toBe(206)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/song\/url\?id=123&br=320000$/),
      expect.objectContaining({
        headers: {
          Cookie: 'MUSIC_U=session-token; __csrf=csrf-token',
          'User-Agent': 'KahiTest/1.0',
        },
      }),
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://cdn.example.test/a.mp3',
      expect.objectContaining({
        headers: {
          Range: 'bytes=0-9',
          Referer: 'https://music.163.com/',
          'User-Agent': 'KahiTest/1.0',
        },
      }),
    )
  })

  test('does not set metadata fetch Cookie header without NCM allowlisted cookies', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockUrlResponse('https://cdn.example.test/a.mp3'))
      .mockResolvedValueOnce(
        new Response('audio-bytes', {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        }),
      )

    const response = await GET(
      createRequest('https://app.example.test/api/song/stream?id=123', {
        headers: {
          Cookie: 'app_session=app; theme=dark; next-auth.session-token=auth',
          'User-Agent': 'KahiTest/1.0',
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/song\/url\?id=123&br=320000$/),
      expect.objectContaining({
        headers: { 'User-Agent': 'KahiTest/1.0' },
      }),
    )
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

  test('collapses missing Vercel forwarded IP to unknown and ignores spoofable IP headers', async () => {
    for (let i = 0; i < 60; i += 1) {
      const response = await GET(
        createRequestWithoutTrustedIp('https://app.example.test/api/song/stream', {
          headers: {
            'X-Forwarded-For': `198.51.100.${i}`,
            'X-Real-IP': `203.0.113.${i}`,
          },
        }),
      )

      expect(response.status).toBe(400)
    }

    const response = await GET(
      createRequestWithoutTrustedIp('https://app.example.test/api/song/stream', {
        headers: {
          'X-Forwarded-For': '198.51.100.200',
          'X-Real-IP': '203.0.113.200',
        },
      }),
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({ message: 'Too many requests' })
  })
})

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, OPTIONS } from '@/app/api/[...path]/route'

const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
const originalApiUrl = process.env.API_URL
const originalNodeEnv = process.env.NODE_ENV
const originalFetch = global.fetch

function createRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init))
}

function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

describe('API proxy route CORS', () => {
  beforeEach(() => {
    process.env.API_URL = 'https://api.example.test'
    delete process.env.ALLOWED_ORIGINS
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    process.env.ALLOWED_ORIGINS = originalAllowedOrigins
    process.env.API_URL = originalApiUrl
    setNodeEnv(originalNodeEnv)
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  test('does not add cross-origin CORS headers by default', async () => {
    const response = await GET(createRequest('https://app.example.test/api/login/status'), {
      params: Promise.resolve({ path: ['login', 'status'] }),
    })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('adds CORS headers only for configured origins', async () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.test'

    const allowedResponse = await OPTIONS(
      createRequest('https://app.example.test/api/login/status', {
        headers: { Origin: 'https://allowed.example.test' },
      }),
    )
    const deniedResponse = await OPTIONS(
      createRequest('https://app.example.test/api/login/status', {
        headers: { Origin: 'https://denied.example.test' },
      }),
    )

    expect(allowedResponse.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://allowed.example.test',
    )
    expect(allowedResponse.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(deniedResponse.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  test('forwards only NCM allowlisted cookies to upstream API', async () => {
    await GET(
      createRequest('https://app.example.test/api/login/status', {
        headers: {
          Cookie: 'app_session=app; MUSIC_U=user; theme=dark; __csrf=csrf; next-auth.session-token=auth; NMTID=nmtid; MUSIC_A=music-a',
          'User-Agent': 'KahiTest/1.0',
        },
      }),
      { params: Promise.resolve({ path: ['login', 'status'] }) },
    )

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.test/login/status',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'MUSIC_U=user; __csrf=csrf; NMTID=nmtid; MUSIC_A=music-a',
          'User-Agent': 'KahiTest/1.0',
        }),
      }),
    )
  })

  test('does not set upstream Cookie header when no NCM allowlisted cookies exist', async () => {
    await GET(
      createRequest('https://app.example.test/api/login/status', {
        headers: {
          Cookie: 'app_session=app; theme=dark; next-auth.session-token=auth',
          'User-Agent': 'KahiTest/1.0',
        },
      }),
      { params: Promise.resolve({ path: ['login', 'status'] }) },
    )

    const [, init] = vi.mocked(global.fetch).mock.calls[0]
    expect(init?.headers).toEqual({ 'User-Agent': 'KahiTest/1.0' })
  })

  test('rejects GET requests to mutating endpoints', async () => {
    for (const path of [
      ['comment', 'like'],
      ['scrobble'],
    ]) {
      const response = await GET(
        createRequest(`https://app.example.test/api/${path.join('/')}?id=1`),
        { params: Promise.resolve({ path }) },
      )

      expect(response.status).toBe(405)
      await expect(response.json()).resolves.toMatchObject({
        message: 'Use POST for this endpoint',
      })
    }

    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('rejects unsafe proxy path segments before URL normalization', async () => {
    const response = await GET(createRequest('https://app.example.test/api/../logout'), {
      params: Promise.resolve({ path: ['..', 'logout'] }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      message: 'Invalid API path',
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('rejects decoded raw path separators before proxying', async () => {
    for (const path of [['\\attacker.example'], ['safe/unsafe']]) {
      const response = await GET(
        createRequest('https://app.example.test/api/login/status'),
        { params: Promise.resolve({ path }) },
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        message: 'Invalid API path',
      })
    }

    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('preserves non-JSON upstream responses and forwards Set-Cookie', async () => {
    const upstreamResponse = new Response('upstream unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    })
    Object.defineProperty(upstreamResponse.headers, 'getSetCookie', {
      value: () => ['MUSIC_U=abc; Domain=.example.test; Path=/'],
    })
    global.fetch = vi.fn().mockResolvedValue(upstreamResponse)

    const response = await GET(createRequest('https://app.example.test/api/login/status'), {
      params: Promise.resolve({ path: ['login', 'status'] }),
    })

    expect(response.status).toBe(503)
    await expect(response.text()).resolves.toBe('upstream unavailable')
    expect(response.headers.get('Set-Cookie')).toContain('MUSIC_U=abc')
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly')
  })

  test('preserves empty upstream responses without reporting API reachability failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

    const response = await GET(createRequest('https://app.example.test/api/login/status'), {
      params: Promise.resolve({ path: ['login', 'status'] }),
    })

    expect(response.status).toBe(204)
    await expect(response.text()).resolves.toBe('')
  })

  test('returns structured response for invalid API_URL configuration', async () => {
    process.env.API_URL = 'not a valid url'

    const response = await GET(createRequest('https://app.example.test/api/login/status'), {
      params: Promise.resolve({ path: ['login', 'status'] }),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      message: 'Invalid API server configuration',
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('returns configuration error when API_URL is missing in production', async () => {
    delete process.env.API_URL
    setNodeEnv('production')

    const response = await GET(createRequest('https://app.example.test/api/login/status'), {
      params: Promise.resolve({ path: ['login', 'status'] }),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      message: 'Invalid API server configuration',
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

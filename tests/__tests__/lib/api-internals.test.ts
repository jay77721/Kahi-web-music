import { afterEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  asArray,
  findResponseLayer,
  isRecord,
  readField,
  readFirstField,
  responseLayers,
} from '@/lib/api-shape'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'
import { resolveNcmApiBase } from '@/lib/server/api-base'
import { createCorsHelpers } from '@/lib/server/cors'
import { createRateLimiter } from '@/lib/server/rate-limit'

const originalApiUrl = process.env.API_URL
const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
const originalNodeEnv = process.env.NODE_ENV
const originalFetch = global.fetch

function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

function request(url = 'https://app.example.test/api/test', init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init))
}

afterEach(() => {
  process.env.API_URL = originalApiUrl
  process.env.ALLOWED_ORIGINS = originalAllowedOrigins
  setNodeEnv(originalNodeEnv)
  global.fetch = originalFetch
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('api-shape helpers', () => {
  test('walks common data wrappers and reads the first available field', () => {
    const raw = { code: 200, data: { data: { songs: [{ id: 1 }] } } }

    expect(responseLayers(raw)).toHaveLength(3)
    expect(readField(raw, 'songs')).toEqual([{ id: 1 }])
    expect(readFirstField(raw, ['playlist', 'songs'])).toEqual([{ id: 1 }])
  })

  test('keeps null only when requested', () => {
    const raw = { data: { profile: null } }

    expect(readField(raw, 'profile')).toBeUndefined()
    expect(readField(raw, 'profile', { includeNull: true })).toBeNull()
  })

  test('finds typed response layers without treating arrays as records', () => {
    const raw = { data: { profile: { userId: 1, nickname: 'Jay' } } }
    const profile = findResponseLayer(
      raw,
      (value): value is { profile: unknown } => isRecord(value) && 'profile' in value,
    )

    expect(profile?.profile).toEqual({ userId: 1, nickname: 'Jay' })
    expect(asArray([1, 2, 3])).toEqual([1, 2, 3])
    expect(asArray('not-array')).toEqual([])
  })
})

describe('server API helpers', () => {
  test('resolves API base from env, dev fallback, or production null', () => {
    process.env.API_URL = 'https://api.example.test'
    expect(resolveNcmApiBase()).toBe('https://api.example.test')

    delete process.env.API_URL
    setNodeEnv('development')
    expect(resolveNcmApiBase()).toBe('http://localhost:3000')

    setNodeEnv('production')
    expect(resolveNcmApiBase()).toBeNull()
  })

  test('builds CORS helpers from the configured origin allowlist', () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.test'
    const cors = createCorsHelpers({
      allowedMethods: 'GET, OPTIONS',
      allowedHeaders: 'Content-Type',
    })

    const allowed = cors.getHeaders(
      request('https://app.example.test/api/test', {
        headers: { Origin: 'https://allowed.example.test' },
      }),
    )
    const denied = cors.getHeaders(
      request('https://app.example.test/api/test', {
        headers: { Origin: 'https://denied.example.test' },
      }),
    )

    expect(allowed).toMatchObject({
      'Access-Control-Allow-Origin': 'https://allowed.example.test',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    expect(denied).toEqual({})
  })

  test('rate-limits by trusted forwarded IP and optional endpoint suffix', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 })
    const firstEndpointRequest = request('https://app.example.test/api/login/status', {
      headers: {
        'x-vercel-forwarded-for': '203.0.113.10',
        'x-forwarded-for': '198.51.100.10',
      },
    })
    const secondEndpointRequest = request('https://app.example.test/api/user/detail', {
      headers: {
        'x-vercel-forwarded-for': '203.0.113.10',
        'x-forwarded-for': '198.51.100.99',
      },
    })

    expect(limiter.check(firstEndpointRequest, '/login/status').limited).toBe(false)
    expect(limiter.check(firstEndpointRequest, '/login/status').limited).toBe(false)
    expect(limiter.check(firstEndpointRequest, '/login/status').limited).toBe(true)
    expect(limiter.check(secondEndpointRequest, '/user/detail').limited).toBe(false)
  })
})

describe('fetchWithTimeout', () => {
  test('forwards a signal and resolves successful fetches', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('ok')) as unknown as typeof fetch

    const response = await fetchWithTimeout('/api/test', { method: 'GET' }, 1000)
    const init = vi.mocked(global.fetch).mock.calls[0]?.[1] as RequestInit | undefined

    expect(await response.text()).toBe('ok')
    expect(init?.method).toBe('GET')
    expect(init?.signal).toBeDefined()
  })

  test('aborts pending fetches after the timeout', async () => {
    global.fetch = vi.fn().mockImplementation((_input, init: RequestInit | undefined) => (
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    )) as unknown as typeof fetch

    await expect(fetchWithTimeout('/api/test', {}, 1)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

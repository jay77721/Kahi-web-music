import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, OPTIONS } from '@/app/api/[...path]/route'

const originalAllowedOrigins = process.env.ALLOWED_ORIGINS
const originalApiUrl = process.env.API_URL
const originalFetch = global.fetch

function createRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init))
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
})

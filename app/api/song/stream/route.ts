import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_URL || 'http://localhost:3000'
const DEFAULT_BITRATE = '320000'
const ALLOWED_BITRATES = new Set(['128000', '192000', '320000', '740000', '999000'])
const DEFAULT_AUDIO_HOST_PATTERNS = [/^(?:[^.]+\.)*music\.126\.net$/i]
const AUDIO_CONTENT_TYPES = ['audio/', 'application/octet-stream', 'binary/octet-stream']
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60
const METADATA_FETCH_TIMEOUT_MS = 8_000
const AUDIO_FETCH_TIMEOUT_MS = 12_000
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

function getAllowedAudioHosts(): Set<string> {
  return new Set(
    (process.env.AUDIO_URL_ALLOWED_HOSTS || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  )
}

function isAllowedAudioHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase()
  const configuredHosts = getAllowedAudioHosts()
  if (configuredHosts.size > 0) {
    return configuredHosts.has(normalizedHost)
  }

  return DEFAULT_AUDIO_HOST_PATTERNS.some((pattern) => pattern.test(normalizedHost))
}

function parseAudioUrl(value: unknown): URL | null {
  if (typeof value !== 'string') {
    return null
  }

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    if (!isAllowedAudioHost(url.hostname)) {
      return null
    }
    return url
  } catch {
    return null
  }
}

function isAudioContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false
  }

  const normalizedType = contentType.split(';')[0].trim().toLowerCase()
  return AUDIO_CONTENT_TYPES.some((allowedType) => normalizedType.startsWith(allowedType))
}

function getClientRateLimitKey(request: NextRequest): string {
  const forwardedByPlatform = request.headers.get('x-vercel-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwardedByPlatform || realIp || 'unknown'
}

function rateLimit(request: NextRequest): NextResponse | null {
  const now = Date.now()
  const key = getClientRateLimitKey(request)
  const bucket = rateLimitBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return null
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { code: 429, message: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000)) },
      },
    )
  }

  rateLimitBuckets.set(key, { ...bucket, count: bucket.count + 1 })
  return null
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function getCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin')
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((allowedOrigin) => allowedOrigin.trim())
      .filter(Boolean),
  )

  if (!origin || !allowedOrigins.has(origin)) {
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function GET(request: NextRequest) {
  const limitedResponse = rateLimit(request)
  if (limitedResponse) {
    return limitedResponse
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ code: 400, message: 'Invalid song id' }, { status: 400 })
  }

  const br = request.nextUrl.searchParams.get('br') || DEFAULT_BITRATE
  if (!ALLOWED_BITRATES.has(br)) {
    return NextResponse.json({ code: 400, message: 'Invalid bitrate' }, { status: 400 })
  }

  try {
    // Fetch audio URL from backend
    const apiUrl = new URL('/song/url', API_BASE)
    apiUrl.searchParams.set('id', id)
    apiUrl.searchParams.set('br', br)

    const apiResponse = await fetch(apiUrl.toString(), {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Real-IP': request.headers.get('x-forwarded-for') || '127.0.0.1',
      },
    })

    if (!apiResponse.ok) {
      return NextResponse.json(
        { code: apiResponse.status, message: 'Failed to get song URL' },
        { status: apiResponse.status }
      )
    }

    const urlData = await apiResponse.json()
    const audioUrl = parseAudioUrl(urlData?.data?.[0]?.url)

    if (!audioUrl) {
      return NextResponse.json(
        { code: 404, message: 'Audio URL not available' },
        { status: 404 }
      )
    }

    // Forward range request headers for seeking support
    const rangeHeader = request.headers.get('range')
    const audioResponse = await fetch(audioUrl.toString(), {
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Real-IP': request.headers.get('x-forwarded-for') || '127.0.0.1',
        'Referer': 'https://music.163.com/',
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    })

    if (!audioResponse.ok) {
      return NextResponse.json(
        { code: 502, message: 'Failed to stream audio' },
        { status: 502 }
      )
    }

    // Get content type from response and only proxy audio-like payloads.
    const rawContentType = audioResponse.headers.get('content-type')
    if (!isAudioContentType(rawContentType)) {
      return NextResponse.json(
        { code: 502, message: 'Upstream response is not audio' },
        { status: 502 },
      )
    }
    const contentType = rawContentType!.split(';')[0].trim()

    // Build response headers - forward relevant headers from CDN
    const headers = new Headers(getCorsHeaders(request))
    headers.set('Content-Type', contentType)
    headers.set('Accept-Ranges', 'bytes')

    // Forward content-length if available
    const contentLength = audioResponse.headers.get('content-length')
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    // Forward content-range for partial content responses
    const contentRange = audioResponse.headers.get('content-range')
    if (contentRange) {
      headers.set('Content-Range', contentRange)
    }

    // Disable compression for binary audio data
    headers.set('Content-Encoding', 'identity')

    // For range requests, use 206 status; otherwise 200
    const status = rangeHeader && audioResponse.status === 206 ? 206 : 200

    return new Response(audioResponse.body, {
      status,
      headers,
    })
  } catch (error) {
    console.error('[Song Stream] Error:', error)
    return NextResponse.json(
      { code: 500, message: 'Stream error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

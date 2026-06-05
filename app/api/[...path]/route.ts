import { NextRequest, NextResponse } from 'next/server'
import { buildNcmCookieHeader } from '@/lib/server/ncm-cookies'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()
let lastRateLimitPruneAt = 0
const RATE_LIMITED_PATH_PATTERNS = [
  /^\/captcha(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/user(?:\/|$)/,
  /^\/.*\/(?:add|del|delete|update|subscribe|sub|like|trash)(?:\/|$)/,
  /^\/(?:like|logout|daily_signin|scrobble|comment)(?:\/|$)/,
]
const GET_MUTATION_ENDPOINTS = new Set([
  '/album/sub',
  '/artist/sub',
  '/captcha/sent',
  '/comment',
  '/comment/like',
  '/daily_signin',
  '/fm/trash',
  '/like',
  '/login/cellphone',
  '/login/refresh',
  '/logout',
  '/playlist/cover/update',
  '/playlist/create',
  '/playlist/delete',
  '/playlist/order/update',
  '/playlist/subscribe',
  '/playlist/track/add',
  '/playlist/track/delete',
  '/playlist/update',
  '/scrobble',
  '/user/cloud/add',
  '/user/cloud/del',
  '/user/follow',
  '/user/update',
  '/video/like',
])

function getAllowedOrigins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
}

function getCorsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin')
  if (!origin || !getAllowedOrigins().has(origin)) {
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

function applyCors(request: NextRequest, response: NextResponse): NextResponse {
  const corsHeaders = getCorsHeaders(request)
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }
  return response
}

function jsonWithCors(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return applyCors(request, NextResponse.json(body, init))
}

function emptyWithCors(request: NextRequest, init?: ResponseInit): NextResponse {
  return applyCors(request, new NextResponse(null, init))
}

function getApiBase(): string {
  if (process.env.API_URL) {
    return process.env.API_URL
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000'
  }

  throw new Error('API_URL is required in production')
}

function getClientRateLimitKey(request: NextRequest): string {
  return request.headers.get('x-vercel-forwarded-for') || 'unknown'
}

function shouldRateLimit(endpoint: string): boolean {
  return RATE_LIMITED_PATH_PATTERNS.some((pattern) => pattern.test(endpoint))
}

function pruneExpiredRateLimitBuckets(now: number): void {
  if (now - lastRateLimitPruneAt < RATE_LIMIT_WINDOW_MS) {
    return
  }

  lastRateLimitPruneAt = now
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key)
    }
  }
}

function isSafePathSegment(segment: string): boolean {
  const normalizedSegment = segment.toLowerCase()
  return segment !== '.'
    && segment !== '..'
    && !segment.includes('/')
    && !segment.includes('\\')
    && !normalizedSegment.includes('%2e')
    && !normalizedSegment.includes('%2f')
    && !normalizedSegment.includes('%5c')
}

function rateLimit(request: NextRequest, endpoint: string): NextResponse | null {
  if (!shouldRateLimit(endpoint)) {
    return null
  }

  const now = Date.now()
  pruneExpiredRateLimitBuckets(now)

  const key = `${getClientRateLimitKey(request)}:${endpoint}`
  const bucket = rateLimitBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return null
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return jsonWithCors(
      request,
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

function normalizeSetCookie(cookie: string): string {
  const parts = cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  const [nameValue, ...attributes] = parts
  if (!nameValue) {
    return cookie
  }

  const filteredAttributes = attributes.filter((attribute) => {
    const lower = attribute.toLowerCase()
    return !lower.startsWith('domain=')
      && lower !== 'httponly'
      && !lower.startsWith('samesite=')
      && lower !== 'secure'
  })
  const securityAttributes = ['HttpOnly', 'SameSite=Lax']
  if (process.env.NODE_ENV === 'production') {
    securityAttributes.push('Secure')
  }

  return [nameValue, ...filteredAttributes, ...securityAttributes].join('; ')
}

async function proxyRequest(request: NextRequest, path: string[]) {
  if (!path.every(isSafePathSegment)) {
    return jsonWithCors(
      request,
      { code: 400, message: 'Invalid API path' },
      { status: 400 },
    )
  }

  const endpoint = '/' + path.join('/')
  const method = request.method.toUpperCase()
  if (method === 'GET' && GET_MUTATION_ENDPOINTS.has(endpoint)) {
    return jsonWithCors(
      request,
      { code: 405, message: 'Use POST for this endpoint' },
      { status: 405 },
    )
  }

  const limitedResponse = rateLimit(request, endpoint)
  if (limitedResponse) {
    return limitedResponse
  }

  const url = request.nextUrl

  // Build the target URL with query params
  let targetUrl: URL
  try {
    const apiBase = getApiBase()
    const apiOrigin = new URL(apiBase).origin
    targetUrl = new URL(endpoint, apiBase)
    if (targetUrl.origin !== apiOrigin) {
      return jsonWithCors(
        request,
        { code: 400, message: 'Invalid API path' },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('[API Proxy] Invalid API_URL configuration:', error)
    return jsonWithCors(
      request,
      { code: 500, message: 'Invalid API server configuration' },
      { status: 500 },
    )
  }

  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value)
  })

  const cookieHeader = buildNcmCookieHeader(request)

  // Forward body only for methods that carry one. Use clone() so the
  // original request stream can still be read elsewhere if needed.
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? await request.clone().arrayBuffer() : undefined

  // Forward Content-Type from the original request when present; some
  // callers (e.g., login, lyric upload) send form-urlencoded or multipart.
  const incomingContentType = request.headers.get('content-type')
  const forwardHeaders: Record<string, string> = {
    'User-Agent': request.headers.get('user-agent') || '',
  }
  if (cookieHeader) {
    forwardHeaders.Cookie = cookieHeader
  }
  if (incomingContentType) {
    forwardHeaders['Content-Type'] = incomingContentType
  } else if (hasBody) {
    forwardHeaders['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(targetUrl.toString(), {
      method,
      headers: forwardHeaders,
      body,
      signal: controller.signal,
      // Avoid Next.js caching POST/PUT/PATCH bodies
      cache: 'no-store',
    })

    const setCookies = response.headers.getSetCookie?.() || []
    const contentType = response.headers.get('content-type') || ''
    const hasResponseBody = response.status !== 204 && response.status !== 205

    let nextResponse: NextResponse
    if (!hasResponseBody) {
      nextResponse = emptyWithCors(request, { status: response.status })
    } else if (contentType.toLowerCase().includes('application/json')) {
      const data = await response.json()
      nextResponse = jsonWithCors(request, data, { status: response.status })
    } else {
      const text = await response.text()
      nextResponse = applyCors(
        request,
        new NextResponse(text, {
          status: response.status,
          headers: contentType ? { 'Content-Type': contentType } : undefined,
        }),
      )
    }

    // Forward Set-Cookie headers from the API even when the upstream body is
    // empty or non-JSON.
    for (const cookie of setCookies) {
      nextResponse.headers.append('Set-Cookie', normalizeSetCookie(cookie))
    }

    return nextResponse
  } catch (error) {
    console.error(`[API Proxy] Error proxying ${endpoint}:`, error)

    if (error instanceof Error && error.name === 'AbortError') {
      return jsonWithCors(
        request,
        { code: 504, message: 'API request timeout' },
        { status: 504 }
      )
    }

    return jsonWithCors(
      request,
      { code: 502, message: 'Failed to reach API server' },
      { status: 502 }
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

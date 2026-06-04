import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_URL || 'http://localhost:3000'
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()
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
  }
}

function getClientRateLimitKey(request: NextRequest): string {
  const forwardedByPlatform = request.headers.get('x-vercel-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwardedByPlatform || realIp || 'unknown'
}

function shouldRateLimit(endpoint: string): boolean {
  return RATE_LIMITED_PATH_PATTERNS.some((pattern) => pattern.test(endpoint))
}

function rateLimit(request: NextRequest, endpoint: string): NextResponse | null {
  if (!shouldRateLimit(endpoint)) {
    return null
  }

  const now = Date.now()
  const key = `${getClientRateLimitKey(request)}:${endpoint}`
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
  const endpoint = '/' + path.join('/')
  const method = request.method.toUpperCase()
  if (method === 'GET' && GET_MUTATION_ENDPOINTS.has(endpoint)) {
    return NextResponse.json(
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
  const targetUrl = new URL(endpoint, API_BASE)
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value)
  })

  // Forward cookies from the original request
  const cookieHeader = request.headers.get('cookie') || ''

  // Forward body only for methods that carry one. Use clone() so the
  // original request stream can still be read elsewhere if needed.
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? await request.clone().text() : undefined

  // Forward Content-Type from the original request when present; some
  // callers (e.g., login, lyric upload) send form-urlencoded or multipart.
  const incomingContentType = request.headers.get('content-type')
  const forwardHeaders: Record<string, string> = {
    'Cookie': cookieHeader,
    'User-Agent': request.headers.get('user-agent') || '',
  }
  if (incomingContentType) {
    forwardHeaders['Content-Type'] = incomingContentType
  } else if (hasBody) {
    forwardHeaders['Content-Type'] = 'application/json'
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(targetUrl.toString(), {
      method,
      headers: forwardHeaders,
      body,
      signal: controller.signal,
      // Avoid Next.js caching POST/PUT/PATCH bodies
      cache: 'no-store',
    })

    clearTimeout(timeout)

    const data = await response.json()

    // Forward Set-Cookie headers from the API
    const nextResponse = NextResponse.json(data, {
      status: response.status,
    })

    const setCookies = response.headers.getSetCookie?.() || []
    for (const cookie of setCookies) {
      nextResponse.headers.append('Set-Cookie', normalizeSetCookie(cookie))
    }

    const corsHeaders = getCorsHeaders(request)
    for (const [key, value] of Object.entries(corsHeaders)) {
      nextResponse.headers.set(key, value)
    }

    return nextResponse
  } catch (error) {
    console.error(`[API Proxy] Error proxying ${endpoint}:`, error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { code: 504, message: 'API request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { code: 502, message: 'Failed to reach API server' },
      { status: 502 }
    )
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

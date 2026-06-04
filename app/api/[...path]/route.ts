import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_URL || 'http://localhost:3000'

async function proxyRequest(request: NextRequest, path: string[]) {
  const endpoint = '/' + path.join('/')
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
  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? await request.clone().text() : undefined

  // Forward Content-Type from the original request when present; some
  // callers (e.g., login, lyric upload) send form-urlencoded or multipart.
  const incomingContentType = request.headers.get('content-type')
  const forwardHeaders: Record<string, string> = {
    'Cookie': cookieHeader,
    'User-Agent': request.headers.get('user-agent') || '',
    'X-Real-IP': request.headers.get('x-forwarded-for') || '127.0.0.1',
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
      nextResponse.headers.append('Set-Cookie', cookie)
    }

    // CORS headers
    nextResponse.headers.set('Access-Control-Allow-Origin', '*')
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Cookie')

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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    },
  })
}

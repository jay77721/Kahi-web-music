import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ code: 400, message: 'Missing song id' }, { status: 400 })
  }

  try {
    // Fetch audio URL from backend
    const apiUrl = new URL('/song/url', API_BASE)
    apiUrl.searchParams.set('id', id)
    const br = request.nextUrl.searchParams.get('br') || '320000'
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
    const audioUrl = urlData?.data?.[0]?.url

    if (!audioUrl) {
      return NextResponse.json(
        { code: 404, message: 'Audio URL not available' },
        { status: 404 }
      )
    }

    // Forward range request headers for seeking support
    const rangeHeader = request.headers.get('range')
    const audioResponse = await fetch(audioUrl, {
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

    // Get content type from response, normalize to audio/mpeg
    const rawContentType = audioResponse.headers.get('content-type') || 'audio/mpeg'
    const contentType = rawContentType.split(';')[0].trim()

    // Build response headers - forward relevant headers from CDN
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

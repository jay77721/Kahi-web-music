import { NextRequest, NextResponse } from 'next/server'

export interface CorsOptions {
  allowedMethods: string
  allowedHeaders: string
}

interface CorsHelpers {
  getHeaders(request: NextRequest): HeadersInit
  apply(request: NextRequest, response: NextResponse): NextResponse
  json(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse
  empty(request: NextRequest, init?: ResponseInit): NextResponse
}

function getAllowedOrigins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
}

export function getCorsHeaders(request: NextRequest, options: CorsOptions): HeadersInit {
  const origin = request.headers.get('origin')
  if (!origin || !getAllowedOrigins().has(origin)) {
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': options.allowedMethods,
    'Access-Control-Allow-Headers': options.allowedHeaders,
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

export function applyCors(
  request: NextRequest,
  response: NextResponse,
  options: CorsOptions
): NextResponse {
  const corsHeaders = getCorsHeaders(request, options)
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }
  return response
}

export function jsonWithCors(
  request: NextRequest,
  body: unknown,
  init: ResponseInit | undefined,
  options: CorsOptions
): NextResponse {
  return applyCors(request, NextResponse.json(body, init), options)
}

export function emptyWithCors(
  request: NextRequest,
  init: ResponseInit | undefined,
  options: CorsOptions
): NextResponse {
  return applyCors(request, new NextResponse(null, init), options)
}

export function createCorsHelpers(options: CorsOptions): CorsHelpers {
  return {
    getHeaders: (request) => getCorsHeaders(request, options),
    apply: (request, response) => applyCors(request, response, options),
    json: (request, body, init) => jsonWithCors(request, body, init, options),
    empty: (request, init) => emptyWithCors(request, init, options),
  }
}

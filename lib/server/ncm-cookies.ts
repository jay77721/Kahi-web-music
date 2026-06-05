import { NextRequest } from 'next/server'

const NCM_COOKIE_ALLOWLIST = new Set(['MUSIC_U', '__csrf', 'NMTID', 'MUSIC_A'])

export function buildNcmCookieHeader(request: NextRequest): string | undefined {
  const cookies = request.cookies
    .getAll()
    .filter((cookie) => NCM_COOKIE_ALLOWLIST.has(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)

  if (cookies.length === 0) {
    return undefined
  }

  return cookies.join('; ')
}

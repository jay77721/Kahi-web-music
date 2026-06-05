// Pure helpers for sharing playlist / album / leaderboard surfaces.
// All copy operations are side-effect-free and safe to call from any layer.
// Embeds are intentionally simple iframe snippets that can be pasted on a blog.

export type ShareableType = 'playlist' | 'album' | 'leaderboard' | 'song' | 'artist'

const TYPE_PATHS: Readonly<Record<ShareableType, string>> = {
  playlist: '/playlist',
  album: '/album',
  leaderboard: '/leaderboard',
  song: '/song',
  artist: '/artist',
}

const TYPE_LABELS: Readonly<Record<ShareableType, string>> = {
  playlist: '歌单',
  album: '专辑',
  leaderboard: '排行榜',
  song: '歌曲',
  artist: '歌手',
}

function normalizeBaseUrl(base?: string): string {
  if (!base || base.length === 0) return ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function getSharePath(type: ShareableType, id: string | number): string {
  return `${TYPE_PATHS[type]}/${encodeURIComponent(String(id))}`
}

export function getShareUrl(
  type: ShareableType,
  id: string | number,
  baseUrl?: string
): string {
  const base = normalizeBaseUrl(baseUrl)
  const path = getSharePath(type, id)
  return base ? `${base}${path}` : path
}

export function getEmbedCode(
  type: ShareableType,
  id: string | number,
  baseUrl?: string
): string {
  const url = getShareUrl(type, id, baseUrl)
  const label = TYPE_LABELS[type]
  const safeUrl = url.replace(/"/g, '&quot;')
  return `<iframe src="${safeUrl}" width="100%" height="380" frameborder="0" title="Kahi Music - ${label}"></iframe>`
}

export interface CopyResult {
  ok: boolean
  method: 'clipboard' | 'fallback' | 'unsupported'
  error?: string
}

// Copy text to clipboard with a graceful fallback path for older browsers.
// Returns a structured result so callers can surface the right toast.
export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, method: 'unsupported', error: 'empty' }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return { ok: true, method: 'clipboard' }
    } catch (error: unknown) {
      return {
        ok: false,
        method: 'clipboard',
        error: error instanceof Error ? error.message : 'unknown',
      }
    }
  }

  if (typeof document === 'undefined') {
    return { ok: false, method: 'unsupported', error: 'no-document' }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    const succeeded = document.execCommand('copy')
    document.body.removeChild(textarea)
    return succeeded
      ? { ok: true, method: 'fallback' }
      : { ok: false, method: 'fallback', error: 'execCommand-failed' }
  } catch (error: unknown) {
    return {
      ok: false,
      method: 'fallback',
      error: error instanceof Error ? error.message : 'unknown',
    }
  }
}

// Build a Web Share API intent payload that callers can pass to
// navigator.share. Kept here so it can be unit-tested without DOM access.
export function buildWebShareData(
  type: ShareableType,
  id: string | number,
  title: string,
  baseUrl?: string
): { title: string; text: string; url: string } {
  const url = getShareUrl(type, id, baseUrl)
  return {
    title,
    text: `${title} - Kahi Music`,
    url,
  }
}

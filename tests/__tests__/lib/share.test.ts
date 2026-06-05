import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildWebShareData,
  copyToClipboard,
  getEmbedCode,
  getSharePath,
  getShareUrl,
  type ShareableType,
} from '@/lib/share'

const types: Array<[ShareableType, string]> = [
  ['playlist', '/playlist'],
  ['album', '/album'],
  ['leaderboard', '/leaderboard'],
  ['song', '/song'],
  ['artist', '/artist'],
]

describe('share utils', () => {
  describe('getSharePath', () => {
    test.each(types)('builds a path for %s', (type, path) => {
      expect(getSharePath(type, 123)).toBe(`${path}/123`)
    })

    test('encodes string ids', () => {
      expect(getSharePath('playlist', 'a b/c')).toBe('/playlist/a%20b%2Fc')
    })
  })

  describe('getShareUrl', () => {
    test('returns path only when no base is provided', () => {
      expect(getShareUrl('playlist', 5)).toBe('/playlist/5')
    })

    test('combines base and path when base is provided', () => {
      expect(getShareUrl('playlist', 5, 'https://example.com')).toBe(
        'https://example.com/playlist/5'
      )
    })

    test('strips a trailing slash from the base url', () => {
      expect(getShareUrl('album', 9, 'https://example.com/')).toBe(
        'https://example.com/album/9'
      )
    })
  })

  describe('getEmbedCode', () => {
    test('produces an iframe snippet containing the share url', () => {
      const code = getEmbedCode('playlist', 11, 'https://k.example')
      expect(code).toContain('<iframe')
      expect(code).toContain('src="https://k.example/playlist/11"')
      expect(code).toContain('title="Kahi Music - 歌单"')
    })

    test('escapes quote characters in the iframe src', () => {
      const code = getEmbedCode('playlist', 'a"b')
      expect(code).toContain('src="/playlist/a%22b"')
      expect(code).not.toContain('src="/playlist/a"b"')
    })
  })

  describe('buildWebShareData', () => {
    test('includes title, text and url', () => {
      const data = buildWebShareData('album', 3, 'Hello', 'https://x')
      expect(data).toEqual({
        title: 'Hello',
        text: 'Hello - Kahi Music',
        url: 'https://x/album/3',
      })
    })
  })

  describe('copyToClipboard', () => {
    const originalExecCommand = document.execCommand

    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      })
      document.execCommand = vi.fn()
    })

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      })
      document.execCommand = originalExecCommand
      vi.restoreAllMocks()
    })

    test('returns unsupported for empty input', async () => {
      const result = await copyToClipboard('')
      expect(result).toEqual({ ok: false, method: 'unsupported', error: 'empty' })
    })

    test('uses the modern clipboard API when available', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })

      const result = await copyToClipboard('hello')
      expect(writeText).toHaveBeenCalledWith('hello')
      expect(result).toEqual({ ok: true, method: 'clipboard' })
    })

    test('returns an error when the modern API throws', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })

      const result = await copyToClipboard('hi')
      expect(result).toEqual({ ok: false, method: 'clipboard', error: 'denied' })
    })

    test('uses textarea fallback when clipboard API is unavailable', async () => {
      vi.mocked(document.execCommand).mockReturnValue(true)

      const result = await copyToClipboard('fallback')

      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(result).toEqual({ ok: true, method: 'fallback' })
    })

    test('reports fallback failure', async () => {
      vi.mocked(document.execCommand).mockReturnValue(false)

      const result = await copyToClipboard('fallback')

      expect(result).toEqual({
        ok: false,
        method: 'fallback',
        error: 'execCommand-failed',
      })
    })
  })
})

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildWebShareData,
  copyToClipboard,
  getEmbedCode,
  getSharePath,
  getShareUrl,
} from '@/lib/share'

describe('share utils', () => {
  describe('getSharePath', () => {
    test('builds a path for a playlist id', () => {
      expect(getSharePath('playlist', 123)).toBe('/playlist/123')
    })

    test('encodes string ids', () => {
      expect(getSharePath('playlist', 'a b/c')).toBe('/playlist/a%20b%2Fc')
    })

    test('builds a path for an album id', () => {
      expect(getSharePath('album', 7)).toBe('/album/7')
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
      expect(code).toContain('title="KaHi Music - 歌单"')
    })

    test('keeps the iframe structure intact for ids with special characters', () => {
      const code = getEmbedCode('playlist', 'a"b')
      // The url inside the iframe src is properly quoted (encoded or escaped).
      expect(code).toMatch(/<iframe src="[^"]*playlist\/a[^"]*" /)
      // The opening quote of the src attribute is never followed by a raw unescaped quote.
      expect(code).not.toMatch(/src="[^"]*"[^>]*src=/)
    })
  })

  describe('buildWebShareData', () => {
    test('includes title, text and url', () => {
      const data = buildWebShareData('album', 3, 'Hello', 'https://x')
      expect(data.title).toBe('Hello')
      expect(data.text).toBe('Hello - KaHi Music')
      expect(data.url).toBe('https://x/album/3')
    })
  })

  describe('copyToClipboard', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      })
    })

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      })
    })

    test('returns unsupported for empty input', async () => {
      const result = await copyToClipboard('')
      expect(result.ok).toBe(false)
      expect(result.method).toBe('unsupported')
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
      expect(result.ok).toBe(false)
      expect(result.method).toBe('clipboard')
      expect(result.error).toBe('denied')
    })
  })
})

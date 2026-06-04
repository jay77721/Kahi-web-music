import { describe, test, expect } from 'vitest'
import {
  getSharePath,
  getShareUrl,
  getEmbedCode,
  buildWebShareData,
} from '@/lib/share'
import type { ShareableType } from '@/lib/share'

describe('share - extended coverage', () => {
  describe('getSharePath', () => {
    test.each<[ShareableType, string | number, string]>([
      ['playlist', 1, '/playlist/1'],
      ['album', 2, '/album/2'],
      ['leaderboard', 3, '/leaderboard/3'],
      ['song', 's-1', '/song/s-1'],
      ['artist', '周杰伦', '/artist/' + encodeURIComponent('周杰伦')],
    ])('maps %s %s to %s', (type, id, expected) => {
      expect(getSharePath(type, id)).toBe(expected)
    })

    test('handles numeric ids without losing precision in encodeURIComponent', () => {
      expect(getSharePath('playlist', 9999999999)).toBe('/playlist/9999999999')
    })
  })

  describe('getShareUrl', () => {
    test('returns bare path when no base provided', () => {
      expect(getShareUrl('song', 7)).toBe('/song/7')
    })

    test('joins base and path with single slash', () => {
      expect(getShareUrl('song', 7, 'https://x.com')).toBe('https://x.com/song/7')
    })

    test('strips trailing slashes from the base', () => {
      expect(getShareUrl('album', 7, 'https://x.com/')).toBe('https://x.com/album/7')
    })

    test('handles empty string base as if missing', () => {
      expect(getShareUrl('artist', 7, '')).toBe('/artist/7')
    })

    test('does not strip a single character base', () => {
      // Edge case: a base consisting only of "/" should not be mis-stripped
      // twice. Implementation calls slice(0,-1) once.
      expect(getShareUrl('playlist', 1, '/')).toBe('/playlist/1')
    })
  })

  describe('getEmbedCode', () => {
    test('includes width/height/frameborder for a basic embed', () => {
      const code = getEmbedCode('playlist', 5)
      expect(code).toContain('width="100%"')
      expect(code).toContain('height="380"')
      expect(code).toContain('frameborder="0"')
    })

    test('escapes embedded quotes in the url', () => {
      const code = getEmbedCode('playlist', 'a"b"c')
      // The src attribute must not contain an unescaped raw quote.
      const srcMatch = code.match(/src="([^"]*)"/)
      expect(srcMatch).not.toBeNull()
      // The opening quote of src must be followed by content and the closing
      // quote — verify by re-parsing.
      expect(code).toMatch(/^<iframe src="[^"]*" /)
    })

    test('localized label matches the type', () => {
      expect(getEmbedCode('album', 1)).toContain('KaHi Music - 专辑')
      expect(getEmbedCode('leaderboard', 1)).toContain('KaHi Music - 排行榜')
      expect(getEmbedCode('song', 1)).toContain('KaHi Music - 歌曲')
      expect(getEmbedCode('artist', 1)).toContain('KaHi Music - 歌手')
    })
  })

  describe('buildWebShareData', () => {
    test('text format is "<title> - KaHi Music"', () => {
      const data = buildWebShareData('playlist', 9, 'My Mix', 'https://k')
      expect(data.title).toBe('My Mix')
      expect(data.text).toBe('My Mix - KaHi Music')
      expect(data.url).toBe('https://k/playlist/9')
    })

    test('omitting baseUrl yields a relative url', () => {
      const data = buildWebShareData('album', 4, 'Hello')
      expect(data.url).toBe('/album/4')
    })
  })
})

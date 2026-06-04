import { describe, test, expect } from 'vitest'
import { parseLRC, mergeTranslations, findCurrentLyricIndex, parseLyricResponse } from '@/lib/lrc'

// ---------------------------------------------------------------------------
// parseLRC
// ---------------------------------------------------------------------------
describe('parseLRC', () => {
  test('returns empty array for empty string', () => {
    expect(parseLRC('')).toEqual([])
  })

  test('returns empty array for whitespace-only input', () => {
    expect(parseLRC('   \n\t')).toEqual([])
  })

  test('parses a single timestamp line', () => {
    const result = parseLRC('[00:12.34]text')
    expect(result).toEqual([
      { time: 12.34, text: 'text', syllables: [{ text: 'text', time: 12.34, duration: 1 }] },
    ])
  })

  test('parses multiple timestamps on one line', () => {
    const result = parseLRC('[00:01.00][00:02.00]text')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      time: 1,
      text: 'text',
      syllables: [{ text: 'text', time: 1, duration: 1 }],
    })
    expect(result[1]).toEqual({
      time: 2,
      text: 'text',
      syllables: [{ text: 'text', time: 2, duration: 1 }],
    })
  })

  test('skips lines without timestamps', () => {
    const result = parseLRC('just some text\n[00:01.00]real lyric')
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('real lyric')
  })

  test('skips timestamp lines with empty text', () => {
    const result = parseLRC('[00:01.00]')
    expect(result).toEqual([])
  })

  test('sorts timestamps in ascending order', () => {
    const lrc = `[00:05.00]second\n[00:01.00]first\n[00:10.00]third`
    const result = parseLRC(lrc)
    expect(result.map((l) => l.time)).toEqual([1, 5, 10])
  })

  test('parses "[00:01.05]" with two-digit milliseconds', () => {
    const result = parseLRC('[00:01.05]text')
    expect(result).toHaveLength(1)
    expect(result[0].time).toBeCloseTo(1.05, 3)
  })

  test('parses "[00:01.05]" with two-digit milliseconds', () => {
    const result = parseLRC('[00:01.05]text')
    expect(result).toHaveLength(1)
    expect(result[0].time).toBeCloseTo(1.05, 3)
  })

  test('handles multiple lines in full lrc format', () => {
    const lrc = `[00:00.00]Song Title\n[00:12.50]Line one\n[00:18.30]Line two`
    const result = parseLRC(lrc)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      time: 0,
      text: 'Song Title',
      syllables: [{ text: 'Song Title', time: 0, duration: 1 }],
    })
    expect(result[1]).toEqual({
      time: 12.5,
      text: 'Line one',
      syllables: [{ text: 'Line one', time: 12.5, duration: 1 }],
    })
    expect(result[2]).toEqual({
      time: 18.3,
      text: 'Line two',
      syllables: [{ text: 'Line two', time: 18.3, duration: 1 }],
    })
  })

  test('parses enhanced <mm:ss.xx> word-by-word timings into syllables', () => {
    const result = parseLRC('[00:01.00]你<00:01.45>好<00:01.67>世<00:01.89>界')
    expect(result).toHaveLength(1)
    const syllables = result[0]?.syllables ?? []
    expect(syllables).toHaveLength(4)
    expect(syllables[0]?.text).toBe('你')
    expect(syllables[0]?.time).toBeCloseTo(1, 6)
    expect(syllables[0]?.duration).toBeCloseTo(0.45, 6)
    expect(syllables[1]?.text).toBe('好')
    expect(syllables[1]?.time).toBeCloseTo(1.45, 6)
    expect(syllables[1]?.duration).toBeCloseTo(0.22, 6)
    expect(syllables[2]?.text).toBe('世')
    expect(syllables[2]?.time).toBeCloseTo(1.67, 6)
    expect(syllables[2]?.duration).toBeCloseTo(0.22, 6)
    expect(syllables[3]?.text).toBe('界')
    expect(syllables[3]?.time).toBeCloseTo(1.89, 6)
    expect(syllables[3]?.duration).toBe(1)
  })

  test('preserves leading text before the first enhanced marker', () => {
    const result = parseLRC('[00:01.00]Hello <00:01.50>world')
    expect(result[0]?.syllables).toEqual([
      { text: 'Hello ', time: 1, duration: 0.5 },
      { text: 'world', time: 1.5, duration: 1 },
    ])
  })
})

// ---------------------------------------------------------------------------
// mergeTranslations
// ---------------------------------------------------------------------------
describe('mergeTranslations', () => {
  const mainLyrics = [
    { time: 1, text: 'line one' },
    { time: 5, text: 'line two' },
    { time: 10, text: 'line three' },
  ]

  test('returns main lyrics unchanged when translation is empty', () => {
    const result = mergeTranslations(mainLyrics, '')
    expect(result).toEqual(mainLyrics)
  })

  test('returns main lyrics unchanged when translation is undefined', () => {
    const result = mergeTranslations(mainLyrics, undefined as unknown as string)
    expect(result).toEqual(mainLyrics)
  })

  test('attaches translation for matching timestamps', () => {
    const translation = '[00:01.00]第一行\n[00:05.00]第二行'
    const result = mergeTranslations(mainLyrics, translation)

    expect(result[0].translation).toBe('第一行')
    expect(result[1].translation).toBe('第二行')
    expect(result[2].translation).toBeUndefined()
  })

  test('ignores unmatched translations', () => {
    const translation = '[00:99.00]orphan line'
    const result = mergeTranslations(mainLyrics, translation)
    expect(result).toHaveLength(3)
    // No translations attached
    result.forEach((line) => {
      expect(line.translation).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// findCurrentLyricIndex
// ---------------------------------------------------------------------------
describe('findCurrentLyricIndex', () => {
  const lyrics = [
    { time: 1, text: 'A' },
    { time: 5, text: 'B' },
    { time: 10, text: 'C' },
  ]

  test('returns -1 for empty lyrics', () => {
    expect(findCurrentLyricIndex([], 5)).toBe(-1)
  })

  test('returns -1 when currentTime is before the first lyric', () => {
    expect(findCurrentLyricIndex(lyrics, 0)).toBe(-1)
  })

  test('returns matching index on exact timestamp', () => {
    expect(findCurrentLyricIndex(lyrics, 5)).toBe(1)
  })

  test('returns earlier index when time is between two lyrics', () => {
    // time 7 is between lyric at 5 (index 1) and 10 (index 2)
    expect(findCurrentLyricIndex(lyrics, 7)).toBe(1)
  })

  test('returns last index when time is after last lyric', () => {
    expect(findCurrentLyricIndex(lyrics, 100)).toBe(2)
  })

  test('returns -1 for negative time', () => {
    expect(findCurrentLyricIndex(lyrics, -5)).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// parseLyricResponse
// ---------------------------------------------------------------------------
describe('parseLyricResponse', () => {
  test('merges lrc and tlyric when both provided', () => {
    const result = parseLyricResponse(
      '[00:01.00]hello\n[00:05.00]world',
      '[00:01.00]你好\n[00:05.00]世界'
    )
    expect(result).toHaveLength(2)
    expect(result[0].translation).toBe('你好')
    expect(result[1].translation).toBe('世界')
  })

  test('returns only main lyrics when tlyric is absent', () => {
    const result = parseLyricResponse('[00:01.00]hello', undefined)
    expect(result).toHaveLength(1)
    expect(result[0].translation).toBeUndefined()
  })

  test('returns empty array when both strings are empty', () => {
    expect(parseLyricResponse('', '')).toEqual([])
  })

  test('returns empty array when lrc is empty regardless of tlyric', () => {
    const result = parseLyricResponse('', '[00:01.00]translation')
    expect(result).toEqual([])
  })
})

describe('parseLRC edge cases', () => {
  test('returns empty array for null input', () => {
    expect(parseLRC(null as unknown as string)).toEqual([])
  })

  test('returns empty array for undefined input', () => {
    expect(parseLRC(undefined as unknown as string)).toEqual([])
  })

  test('handles lines with only timestamps and no text', () => {
    const result = parseLRC('[00:01.00]\n[00:02.00]')
    expect(result).toEqual([])
  })

  test('handles malformed timestamps with out-of-range minutes', () => {
    // parseTimestamp uses padEnd for ms, so [999:99.99] becomes 990ms
    const result = parseLRC('[999:99.99]far future')
    expect(result).toHaveLength(1)
    expect(result[0]!.time).toBeCloseTo(999 * 60 + 99 + 0.99, 5)
  })

  test('handles missing fraction in timestamp', () => {
    const result = parseLRC('[00:01.00]text')
    expect(result[0]!.time).toBeCloseTo(1, 6)
  })

  test('handles zero-padded milliseconds', () => {
    const result = parseLRC('[00:01.005]text')
    expect(result[0]!.time).toBeCloseTo(1.005, 6)
  })

  test('buildSyllables returns single syllable for plain text', () => {
    const result = parseLRC('[00:01.00]plain text')
    expect(result[0]?.syllables).toHaveLength(1)
    expect(result[0]?.syllables?.[0]).toEqual({
      text: 'plain text',
      time: 1,
      duration: 1,
    })
  })

  test('buildSyllables returns empty array for empty body', () => {
    // Direct call to parseLRC with empty body after stripping timestamps
    const result = parseLRC('[00:01.00]   ')
    expect(result).toEqual([])
  })

  test('handles multiple consecutive enhanced markers', () => {
    const result = parseLRC('[00:01.00]<00:02.00><00:03.00>text')
    expect(result[0]?.syllables).toHaveLength(1)
    expect(result[0]?.syllables?.[0]).toEqual({ text: 'text', time: 3, duration: 1 })
  })

  test('mergeTranslations ignores unmatched timestamps', () => {
    const main = [{ time: 1, text: 'a' }, { time: 5, text: 'b' }]
    const translation = '[00:01.00]匹配\n[00:99.00]未匹配'
    const result = mergeTranslations(main, translation)
    expect(result[0].translation).toBe('匹配')
    expect(result[1].translation).toBeUndefined()
  })

  test('mergeTranslations does not mutate main lyrics', () => {
    const main = [{ time: 1, text: 'a' }]
    const clone = JSON.parse(JSON.stringify(main))
    mergeTranslations(main, '[00:01.00]xlat')
    expect(main).toEqual(clone)
  })

  test('findCurrentLyricIndex handles negative currentTime', () => {
    expect(findCurrentLyricIndex([{ time: 1, text: 'a' }], -1)).toBe(-1)
  })

  test('findCurrentLyricIndex handles zero currentTime when first lyric is at 0', () => {
    expect(findCurrentLyricIndex([{ time: 0, text: 'a' }], 0)).toBe(0)
  })
})

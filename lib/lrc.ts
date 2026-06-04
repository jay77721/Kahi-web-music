import type { LyricSyllable } from '@/types'

export interface LyricLine {
  time: number    // seconds
  text: string
  translation?: string
  syllables?: LyricSyllable[]
}

const TIMESTAMP_PATTERN = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g
const SYLLABLE_PATTERN = /<(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?>/g

/**
 * Parse a `[mm:ss.xx]` or `<mm:ss.xx>` token into seconds.
 * Returns 0 for malformed input.
 */
function parseTimestamp(minutes: string, seconds: string, fraction: string | undefined): number {
  const m = parseInt(minutes, 10)
  const s = parseInt(seconds, 10)
  const ms = fraction ? parseInt(fraction.padEnd(3, '0').slice(0, 3), 10) : 0
  return m * 60 + s + ms / 1000
}

/**
 * Split a lyric body into syllables, attaching a start time to each.
 *
 * Two shapes are supported:
 *   - Plain text — a single syllable whose time is the line stamp.
 *   - Enhanced `<mm:ss.xx>` form — each `<...>` marker starts a new syllable;
 *     the leading run before the first marker keeps the line stamp.
 *
 * The syllables concatenate back to the original `body`, so `text` stays the
 * source of truth for screen readers.
 */
function buildSyllables(lineTime: number, body: string): LyricSyllable[] {
  if (!body) return []

  // Fast path: no enhanced markers — one syllable spanning the full body.
  if (!SYLLABLE_PATTERN.test(body)) {
    return [{ text: body, time: lineTime, duration: 1 }]
  }
  SYLLABLE_PATTERN.lastIndex = 0

  const syllables: LyricSyllable[] = []
  let cursor = 0
  let activeTime = lineTime

  for (const match of body.matchAll(SYLLABLE_PATTERN)) {
    const index = match.index ?? 0
    const segment = body.slice(cursor, index)
    if (segment.length > 0) {
      syllables.push({ text: segment, time: activeTime })
    }
    activeTime = parseTimestamp(match[1] ?? '0', match[2] ?? '0', match[3])
    cursor = index + match[0].length
  }

  const tail = body.slice(cursor)
  if (tail.length > 0) {
    syllables.push({ text: tail, time: activeTime })
  }

  if (syllables.length === 0) {
    return [{ text: body, time: lineTime }]
  }

  return fillDurations(syllables)
}

/**
 * Compute each syllable's duration from the next syllable's start time.
 * The trailing syllable falls back to a 1s estimate so the UI still has
 * a non-zero value to drive its highlight transition.
 */
function fillDurations(syllables: LyricSyllable[]): LyricSyllable[] {
  return syllables.map((syl, i) => {
    const next = syllables[i + 1]
    const duration = next ? Math.max(0, next.time - syl.time) : 1
    return { text: syl.text, time: syl.time, duration }
  })
}

/**
 * Parse LRC format lyrics into structured data
 *
 * Supported formats:
 *   [mm:ss.xx]lyrics text
 *   [mm:ss.xx]你<00:01.45>好<00:01.67>世<00:01.89>界  (enhanced word-by-word)
 *   [mm:ss.xx][mm:ss.xx]lyrics text                     (multiple timestamps per line)
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return []

  const lines = lrcText.split('\n')
  const result: LyricLine[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    TIMESTAMP_PATTERN.lastIndex = 0
    const stamps: number[] = []
    let stampMatch: RegExpExecArray | null
    while ((stampMatch = TIMESTAMP_PATTERN.exec(trimmed)) !== null) {
      stamps.push(parseTimestamp(stampMatch[1] ?? '0', stampMatch[2] ?? '0', stampMatch[3]))
    }
    if (stamps.length === 0) continue

    const body = trimmed.replace(TIMESTAMP_PATTERN, '').trim()
    if (!body) continue

    for (const time of stamps) {
      result.push({ time, text: body, syllables: buildSyllables(time, body) })
    }
  }

  // Sort by time; stable on duplicates so we don't reshuffle them.
  result.sort((a, b) => a.time - b.time)
  return result
}

/**
 * Parse translation lyrics and merge with main lyrics
 */
export function mergeTranslations(
  mainLyrics: LyricLine[],
  translationText: string
): LyricLine[] {
  if (!translationText) return mainLyrics

  const translations = parseLRC(translationText)
  const translationMap = new Map<number, string>()

  for (const t of translations) {
    translationMap.set(t.time, t.text)
  }

  return mainLyrics.map(line => ({
    ...line,
    translation: translationMap.get(line.time),
  }))
}

/**
 * Find the current lyric index based on playback time
 */
export function findCurrentLyricIndex(
  lyrics: LyricLine[],
  currentTime: number
): number {
  if (lyrics.length === 0) return -1

  // Find the last lyric line whose time is <= currentTime
  let index = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i]!.time <= currentTime) {
      index = i
    } else {
      break
    }
  }
  return index
}

/**
 * Parse the full lyric response from API
 * Returns merged main lyrics + translations
 */
export function parseLyricResponse(
  lrcLyric: string,
  tlyricLyric?: string
): LyricLine[] {
  const mainLyrics = parseLRC(lrcLyric)
  if (tlyricLyric) {
    return mergeTranslations(mainLyrics, tlyricLyric)
  }
  return mainLyrics
}

import { describe, test, expect } from 'vitest'
import {
  formatDuration,
  formatTime,
  formatCount,
  formatDate,
  formatRelativeTime,
  formatArtists,
  imageUrl,
  truncate,
  formatFileSize,
} from '@/lib/format'

describe('formatDuration', () => {
  test('formats 0 milliseconds as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  test('formats 90 seconds (90000 ms) as "1:30"', () => {
    expect(formatDuration(90000)).toBe('1:30')
  })

  test('formats 59:59 (3599999 ms) as "59:59"', () => {
    expect(formatDuration(3599999)).toBe('59:59')
  })

  test('formats negative values using floor division', () => {
    // Math.floor(-500 / 1000) = -1, -1 % 60 = -1 => "-1:-1" via toString
    expect(formatDuration(-500)).toBe('-1:-1')
  })

  test('formats exactly one minute (60000 ms) as "1:00"', () => {
    expect(formatDuration(60000)).toBe('1:00')
  })

  test('formats single-digit seconds with leading zero', () => {
    expect(formatDuration(65000)).toBe('1:05')
  })
})

describe('formatTime', () => {
  test('formats 90 seconds as "1:30"', () => {
    expect(formatTime(90)).toBe('1:30')
  })

  test('formats 0 as "0:00"', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  test('formats 3661 seconds (61 min 1 sec) as "61:01"', () => {
    expect(formatTime(3661)).toBe('61:01')
  })

  test('formats exactly one minute as "1:00"', () => {
    expect(formatTime(60)).toBe('1:00')
  })
})

describe('formatCount', () => {
  test('formats 999 as "999"', () => {
    expect(formatCount(999)).toBe('999')
  })

  test('formats 10000 as "1万"', () => {
    expect(formatCount(10000)).toBe('1万')
  })

  test('formats 12345 as "1万" (floor division)', () => {
    expect(formatCount(12345)).toBe('1万')
  })

  test('formats 100000000 as "1.0亿"', () => {
    expect(formatCount(100000000)).toBe('1.0亿')
  })

  test('formats 99999999 as "9999万"', () => {
    expect(formatCount(99999999)).toBe('9999万')
  })

  test('formats 0 as "0"', () => {
    expect(formatCount(0)).toBe('0')
  })
})

describe('formatDate', () => {
  test('returns locale date string for a valid timestamp', () => {
    // 2024-11-17 in China is 2024/11/17
    const result = formatDate(1731811200000)
    expect(result).toContain('2024')
    expect(result).toContain('11')
    expect(result).toContain('17')
  })

  test('formats epoch start (1970)', () => {
    const result = formatDate(0)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})

describe('formatRelativeTime', () => {
  test('returns "刚刚" for timestamps less than 60 seconds ago', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 30_000)).toBe('刚刚')
  })

  test('returns "5分钟前" for 5 minutes ago', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5分钟前')
  })

  test('returns "3天前" for 3 days ago', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 3 * 24 * 60 * 60 * 1000)).toBe('3天前')
  })

  test('returns "1年前" for timestamps older than 365 days', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 400 * 24 * 60 * 60 * 1000)).toBe('1年前')
  })

  test('returns "2小时前" for 2 hours ago', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 2 * 60 * 60 * 1000)).toBe('2小时前')
  })

  test('returns "1个月前" for ~45 days ago', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 45 * 24 * 60 * 60 * 1000)).toBe('1个月前')
  })
})

describe('formatArtists', () => {
  test('returns empty string for empty array', () => {
    expect(formatArtists([])).toBe('')
  })

  test('returns single artist name', () => {
    expect(formatArtists([{ name: '周杰伦' }])).toBe('周杰伦')
  })

  test('joins multiple artists with " / "', () => {
    const artists = [
      { name: '周杰伦' },
      { name: '方文山' },
      { name: '蔡依林' },
    ]
    expect(formatArtists(artists)).toBe('周杰伦 / 方文山 / 蔡依林')
  })
})

describe('imageUrl', () => {
  test('returns "/placeholder.png" for empty string', () => {
    expect(imageUrl('')).toBe('/placeholder.png')
  })

  test('returns "/placeholder.png" for falsy url', () => {
    expect(imageUrl('' as unknown as string)).toBe('/placeholder.png')
  })

  test('returns url unchanged when no size provided', () => {
    expect(imageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg')
  })

  test('appends size parameter when size is provided', () => {
    expect(imageUrl('https://example.com/img.jpg', 300)).toBe(
      'https://example.com/img.jpg?param=300y300'
    )
  })

  test('appends size parameter for size=500', () => {
    expect(imageUrl('https://example.com/cover.png', 500)).toBe(
      'https://example.com/cover.png?param=500y500'
    )
  })
})

describe('truncate', () => {
  test('returns short text unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  test('returns text unchanged when length equals maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  test('truncates text over maxLength and appends "..."', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  test('truncates at exact boundary without adding extra chars', () => {
    // "12345" length 5, max 5 -> unchanged
    expect(truncate('12345', 5)).toBe('12345')
    // "123456" length 6, max 5 -> "12345..."
    expect(truncate('123456', 5)).toBe('12345...')
  })

  test('returns empty string for empty input', () => {
    expect(truncate('', 10)).toBe('')
  })
})

describe('formatFileSize', () => {
  test('formats 500 bytes as "500 B"', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  test('formats 1536 bytes as "1.5 KB"', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  test('formats 5242880 bytes as "5.0 MB"', () => {
    expect(formatFileSize(5242880)).toBe('5.0 MB')
  })

  test('formats exactly 1024 bytes as "1.0 KB"', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  test('formats exactly 1048576 bytes as "1.0 MB"', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
  })

  test('formats 0 bytes as "0 B"', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })
})

import { describe, test, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  // ---- basic class merging ----
  test('merges two basic classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  test('returns single class unchanged', () => {
    expect(cn('solo')).toBe('solo')
  })

  test('returns empty string for no input', () => {
    expect(cn()).toBe('')
  })

  // ---- tailwind-merge conflict resolution ----
  test('resolves conflicting Tailwind padding classes', () => {
    // "px-2 px-4" -> tailwind-merge keeps the last: px-4
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  test('resolves conflicting flex direction classes', () => {
    expect(cn('flex-row', 'flex-col')).toBe('flex-col')
  })

  test('resolves conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  test('does not merge non-conflicting classes', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })

  // ---- conditional / clsx-style classes ----
  test('handles truthy/falsy conditional classes', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active')
  })

  test('handles array of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  test('handles object-style conditional classes', () => {
    expect(cn({
      'active': true,
      'disabled': false,
      'hidden': true,
    })).toBe('active hidden')
  })

  test('ignores undefined and null inputs', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  test('filters out empty strings', () => {
    expect(cn('', 'foo', '', 'bar')).toBe('foo bar')
  })

  // ---- combined scenarios ----
  test('merges base, conditional, and conflicting classes correctly', () => {
    const isLarge = false
    // text-sm and text-base are both font-size utilities — tailwind-merge keeps only the last
    expect(cn('text-sm', isLarge && 'text-xl', 'text-base')).toBe('text-base')
  })
})

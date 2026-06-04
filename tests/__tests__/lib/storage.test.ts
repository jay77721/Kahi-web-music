import { describe, test, expect, beforeEach } from 'vitest'
import { storage, STORAGE_KEYS } from '@/lib/storage'

// ---------------------------------------------------------------------------
// Storage tests — uses the jsdom-localStorage mock from setup.ts
// ---------------------------------------------------------------------------
describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ---- get ----
  describe('get', () => {
    test('returns default value for missing key', () => {
      expect(storage.get('missing', 'fallback')).toBe('fallback')
    })

    test('returns default value for corrupted JSON', () => {
      localStorage.setItem('kahi-web-music:corrupt', 'not-json{{')
      expect(storage.get('corrupt', 'fallback')).toBe('fallback')
    })

    test('parses and returns stored JSON value', () => {
      localStorage.setItem('kahi-web-music:myKey', JSON.stringify({ name: 'test' }))
      expect(storage.get('myKey', null)).toEqual({ name: 'test' })
    })

    test('returns null when key value is JSON null', () => {
      localStorage.setItem('kahi-web-music:nullKey', 'null')
      expect(storage.get('nullKey', 'fallback')).toBeNull()
    })
  })

  // ---- set + get round-trip ----
  describe('set + get round-trip', () => {
    test('stores a string and retrieves it', () => {
      storage.set('greeting', 'hello')
      expect(storage.get('greeting', '')).toBe('hello')
    })

    test('stores an object and retrieves it', () => {
      const obj = { id: 1, tags: ['a', 'b'] }
      storage.set('item', obj)
      expect(storage.get('item', null)).toEqual(obj)
    })

    test('overwrites existing value', () => {
      storage.set('key', 'v1')
      storage.set('key', 'v2')
      expect(storage.get('key', '')).toBe('v2')
    })
  })

  // ---- remove ----
  describe('remove', () => {
    test('removes a stored key', () => {
      storage.set('removable', 'value')
      storage.remove('removable')
      expect(storage.get('removable', 'not-found')).toBe('not-found')
    })

    test('does not affect other keys', () => {
      storage.set('keep', 'keep-me')
      storage.set('other', 'remove-me')
      storage.remove('other')
      expect(storage.get('keep', null)).toEqual('keep-me')
      expect(storage.get('other', null)).toBeNull()
    })
  })

  // ---- clear ----
  describe('clear', () => {
    test('removes keys set via storage.set()', () => {
      storage.set('a', 1)
      storage.set('b', 2)

      storage.clear()

      // After clear, both keys should return their defaults
      expect(storage.get('a', null)).toBeNull()
      expect(storage.get('b', null)).toBeNull()
    })

    test('does not throw when no kahi-web-music keys exist', () => {
      localStorage.setItem('random', 'data')
      expect(() => storage.clear()).not.toThrow()
      expect(localStorage.getItem('random')).toBe('data')
    })
  })
})

// ---------------------------------------------------------------------------
// STORAGE_KEYS constants
// ---------------------------------------------------------------------------
describe('STORAGE_KEYS', () => {
  test('all values are string literals', () => {
    const values = Object.values(STORAGE_KEYS)
    values.forEach((v) => {
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    })
  })

  test('contains all expected keys', () => {
    expect(STORAGE_KEYS).toMatchObject({
      PLAY_QUEUE: 'player:queue',
      PLAY_INDEX: 'player:index',
      PLAY_MODE: 'player:mode',
      VOLUME: 'player:volume',
      SEARCH_HISTORY: 'search:history',
      USER_COOKIE: 'user:cookie',
      THEME: 'ui:theme',
    })
  })

  test('has no duplicate values', () => {
    const values = Object.values(STORAGE_KEYS)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})

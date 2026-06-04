import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkApiHealth, checkAudioContext, runHealthCheck } from '@/lib/health'

describe('lib/health', () => {
  describe('checkApiHealth', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    test('returns true when fetch resolves with ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
      const result = await checkApiHealth(1000)
      expect(result).toBe(true)
    })

    test('returns false when fetch resolves with !ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
      const result = await checkApiHealth(1000)
      expect(result).toBe(false)
    })

    test('returns false when fetch throws', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network-down')) as unknown as typeof fetch
      const result = await checkApiHealth(1000)
      expect(result).toBe(false)
    })

    test('returns false when fetch is aborted by the timeout', async () => {
      // fetch that never resolves; the timeout should abort it
      globalThis.fetch = vi.fn().mockImplementation((_url, init: RequestInit | undefined) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      }) as unknown as typeof fetch
      const result = await checkApiHealth(20)
      expect(result).toBe(false)
    })

    test('uses default timeout of 5000ms', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
      globalThis.fetch = fetchSpy as unknown as typeof fetch
      await checkApiHealth()
      expect(fetchSpy).toHaveBeenCalled()
      const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined
      expect(init?.signal).toBeDefined()
    })
  })

  describe('checkAudioContext', () => {
    let originalAudioContext: unknown
    let originalWebkitAudioContext: unknown

    beforeEach(() => {
      originalAudioContext = (window as unknown as Record<string, unknown>).AudioContext
      originalWebkitAudioContext = (window as unknown as Record<string, unknown>).webkitAudioContext
    })

    afterEach(() => {
      if (originalAudioContext !== undefined) {
        ;(window as unknown as Record<string, unknown>).AudioContext = originalAudioContext
      } else {
        delete (window as unknown as Record<string, unknown>).AudioContext
      }
      if (originalWebkitAudioContext !== undefined) {
        ;(window as unknown as Record<string, unknown>).webkitAudioContext = originalWebkitAudioContext
      } else {
        delete (window as unknown as Record<string, unknown>).webkitAudioContext
      }
    })

    test('returns true when AudioContext is present', () => {
      ;(window as unknown as Record<string, unknown>).AudioContext = class {}
      expect(checkAudioContext()).toBe(true)
    })

    test('returns true when only webkitAudioContext is present', () => {
      delete (window as unknown as Record<string, unknown>).AudioContext
      ;(window as unknown as Record<string, unknown>).webkitAudioContext = class {}
      expect(checkAudioContext()).toBe(true)
    })

    test('returns false when neither AudioContext nor webkitAudioContext is present', () => {
      delete (window as unknown as Record<string, unknown>).AudioContext
      delete (window as unknown as Record<string, unknown>).webkitAudioContext
      expect(checkAudioContext()).toBe(false)
    })
  })

  describe('runHealthCheck', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    test('returns success when both checks pass', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
      ;(window as unknown as Record<string, unknown>).AudioContext = class {}
      const result = await runHealthCheck()
      expect(result.success).toBe(true)
      expect(result.data.api).toBe(true)
      expect(result.data.audioContext).toBe(true)
      expect(typeof result.data.timestamp).toBe('number')
    })

    test('returns error when api is unreachable', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
      ;(window as unknown as Record<string, unknown>).AudioContext = class {}
      const result = await runHealthCheck()
      expect(result.success).toBe(false)
      expect(result.data.api).toBe(false)
      expect(result.error).toContain('无法连接')
    })

    test('returns error when audioContext is missing', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
      delete (window as unknown as Record<string, unknown>).AudioContext
      delete (window as unknown as Record<string, unknown>).webkitAudioContext
      const result = await runHealthCheck()
      expect(result.success).toBe(false)
      expect(result.data.audioContext).toBe(false)
      expect(result.error).toContain('音频')
    })

    test('api error takes priority over audioContext error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
      delete (window as unknown as Record<string, unknown>).AudioContext
      delete (window as unknown as Record<string, unknown>).webkitAudioContext
      const result = await runHealthCheck()
      expect(result.success).toBe(false)
      expect(result.error).toContain('无法连接')
    })
  })
})

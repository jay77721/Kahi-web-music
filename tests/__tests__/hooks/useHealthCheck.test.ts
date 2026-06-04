import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Stub the sonner toast module so we can assert on its calls.
const toastErrorMock = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

import { useHealthCheck } from '@/hooks/useHealthCheck'
import { runHealthCheck } from '@/lib/health'

vi.mock('@/lib/health', () => ({
  runHealthCheck: vi.fn(),
}))

const runHealthCheckMock = vi.mocked(runHealthCheck)

describe('useHealthCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    runHealthCheckMock.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('starts in an unknown healthy state', () => {
    const { result } = renderHook(() => useHealthCheck(false))
    expect(result.current.isHealthy).toBeNull()
    expect(result.current.isChecking).toBe(false)
  })

  test('does not check on mount when checkOnMount is false', async () => {
    renderHook(() => useHealthCheck(false))
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(runHealthCheckMock).not.toHaveBeenCalled()
  })

  test('transitions to healthy when runHealthCheck returns success', async () => {
    runHealthCheckMock.mockResolvedValue({
      success: true,
      data: { api: true, audioContext: true, timestamp: 12345 },
    })
    const { result } = renderHook(() => useHealthCheck(false))

    await act(async () => {
      await result.current.runCheck()
    })
    expect(result.current.isHealthy).toBe(true)
    expect(result.current.apiDown).toBe(false)
    expect(result.current.errorMessage).toBeNull()
    expect(result.current.isChecking).toBe(false)
  })

  test('marks apiDown when API is unhealthy and shows a toast', async () => {
    runHealthCheckMock.mockResolvedValue({
      success: false,
      data: { api: false, audioContext: true, timestamp: 12345 },
      error: '无法连接',
    })
    const { result } = renderHook(() => useHealthCheck(false))

    await act(async () => {
      await result.current.runCheck()
    })

    expect(result.current.isHealthy).toBe(false)
    expect(result.current.apiDown).toBe(true)
    expect(result.current.errorMessage).toBe('无法连接')
    expect(toastErrorMock).toHaveBeenCalled()
  })

  test('marks errorMessage when audioContext is unhealthy but does not toast', async () => {
    runHealthCheckMock.mockResolvedValue({
      success: false,
      data: { api: true, audioContext: false, timestamp: 12345 },
      error: '浏览器不支持',
    })
    const { result } = renderHook(() => useHealthCheck(false))

    await act(async () => {
      await result.current.runCheck()
    })

    expect(result.current.isHealthy).toBe(false)
    expect(result.current.apiDown).toBe(false)
    expect(result.current.errorMessage).toBe('浏览器不支持')
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  test('falls back to a default error message when result.error is missing', async () => {
    runHealthCheckMock.mockResolvedValue({
      success: false,
      data: { api: false, audioContext: true, timestamp: 0 },
    })
    const { result } = renderHook(() => useHealthCheck(false))
    await act(async () => {
      await result.current.runCheck()
    })
    expect(result.current.errorMessage).toBe('服务异常')
  })

  test('handles thrown errors by leaving isChecking=false', async () => {
    runHealthCheckMock.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useHealthCheck(false))
    await act(async () => {
      await result.current.runCheck()
    })
    expect(result.current.isChecking).toBe(false)
    expect(result.current.isHealthy).toBeNull()
  })

  test('retryApi clears apiDown before re-running the check', async () => {
    runHealthCheckMock.mockResolvedValueOnce({
      success: false,
      data: { api: false, audioContext: true, timestamp: 0 },
      error: 'down',
    })
    const { result } = renderHook(() => useHealthCheck(false))
    await act(async () => {
      await result.current.runCheck()
    })
    expect(result.current.apiDown).toBe(true)

    runHealthCheckMock.mockResolvedValueOnce({
      success: true,
      data: { api: true, audioContext: true, timestamp: 1 },
    })

    await act(async () => {
      await result.current.retryApi()
    })
    expect(result.current.isHealthy).toBe(true)
  })

  test('checkOnMount runs the check after the 2s delay', async () => {
    runHealthCheckMock.mockResolvedValue({
      success: true,
      data: { api: true, audioContext: true, timestamp: 0 },
    })
    renderHook(() => useHealthCheck(true))
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    // Flush microtasks so the async runCheck() state updates propagate
    await Promise.resolve()
    expect(runHealthCheckMock).toHaveBeenCalled()
  })

  test('periodic re-check fires when api is down', async () => {
    runHealthCheckMock.mockResolvedValue({
      success: false,
      data: { api: false, audioContext: true, timestamp: 0 },
      error: 'down',
    })
    renderHook(() => useHealthCheck(true, 5000))
    // First check happens after 2s.
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    const callCountAfterFirst = runHealthCheckMock.mock.calls.length
    expect(callCountAfterFirst).toBeGreaterThanOrEqual(1)

    // Advance 5s for the interval to fire
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(runHealthCheckMock.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
  })
})

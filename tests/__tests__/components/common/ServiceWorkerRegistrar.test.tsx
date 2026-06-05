import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import type { RegisterOptions } from '@/lib/sw-register'
import { ServiceWorkerRegistrar } from '@/components/common/ServiceWorkerRegistrar'

const mocks = vi.hoisted(() => ({
  applyServiceWorkerUpdate: vi.fn(),
  registerServiceWorker: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/lib/sw-register', () => ({
  applyServiceWorkerUpdate: mocks.applyServiceWorkerUpdate,
  registerServiceWorker: mocks.registerServiceWorker,
}))

vi.mock('sonner', () => ({
  toast: mocks.toast,
}))

const idleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback')
const cancelIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback')

function restoreIdleCallbacks() {
  if (idleDescriptor) {
    Object.defineProperty(window, 'requestIdleCallback', idleDescriptor)
  } else {
    Reflect.deleteProperty(window, 'requestIdleCallback')
  }

  if (cancelIdleDescriptor) {
    Object.defineProperty(window, 'cancelIdleCallback', cancelIdleDescriptor)
  } else {
    Reflect.deleteProperty(window, 'cancelIdleCallback')
  }
}

function removeIdleCallbacks() {
  Reflect.deleteProperty(window, 'requestIdleCallback')
  Reflect.deleteProperty(window, 'cancelIdleCallback')
}

describe('ServiceWorkerRegistrar', () => {
  let capturedOptions: RegisterOptions | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    capturedOptions = undefined
    mocks.registerServiceWorker.mockImplementation((options: RegisterOptions) => {
      capturedOptions = options
      return Promise.resolve(null)
    })
    mocks.applyServiceWorkerUpdate.mockReset()
    mocks.toast.mockReset()
    removeIdleCallbacks()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    restoreIdleCallbacks()
    vi.clearAllMocks()
  })

  test('registers after hydration using the timeout fallback', () => {
    render(<ServiceWorkerRegistrar />)

    expect(mocks.registerServiceWorker).not.toHaveBeenCalled()

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(mocks.registerServiceWorker).toHaveBeenCalledTimes(1)
  })

  test('cancels delayed fallback registration on unmount', () => {
    const { unmount } = render(<ServiceWorkerRegistrar />)

    unmount()
    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(mocks.registerServiceWorker).not.toHaveBeenCalled()
  })

  test('uses requestIdleCallback when it is available', async () => {
    let idleCallback: IdleRequestCallback | undefined
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallback = callback
      return 7
    })
    const cancelIdleCallback = vi.fn()

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: requestIdleCallback,
    })
    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      value: cancelIdleCallback,
    })

    render(<ServiceWorkerRegistrar />)

    await waitFor(() => {
      expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 })
    })
    expect(mocks.registerServiceWorker).not.toHaveBeenCalled()

    act(() => {
      idleCallback?.({
        didTimeout: false,
        timeRemaining: () => 50,
      })
    })

    expect(mocks.registerServiceWorker).toHaveBeenCalledTimes(1)
  })

  test('shows a single update toast when refresh is needed repeatedly', () => {
    render(<ServiceWorkerRegistrar />)

    act(() => {
      vi.runOnlyPendingTimers()
    })

    capturedOptions?.onNeedRefresh?.()
    capturedOptions?.onNeedRefresh?.()

    expect(mocks.toast).toHaveBeenCalledTimes(1)
    expect(mocks.toast).toHaveBeenCalledWith(
      'New version available',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Reload' }),
        cancel: expect.objectContaining({ label: 'Later' }),
      })
    )
  })
})

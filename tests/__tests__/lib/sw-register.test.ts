import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  registerServiceWorker,
  applyServiceWorkerUpdate,
} from '@/lib/sw-register'

/* ------------------------------------------------------------------ *
 * Helpers — build a fake navigator.serviceWorker surface
 * ------------------------------------------------------------------ */
type Listener = (event?: unknown) => void

interface FakeWorker extends EventTarget {
  state: ServiceWorkerState
  scriptURL: string
  postMessage: ReturnType<typeof vi.fn>
}

interface FakeRegistration {
  active: FakeWorker | null
  installing: FakeWorker | null
  waiting: FakeWorker | null
  scope: string
  update: ReturnType<typeof vi.fn>
  unregister: ReturnType<typeof vi.fn>
  addEventListener: (type: string, listener: Listener) => void
  removeEventListener: (type: string, listener: Listener) => void
  dispatchEvent: (event: Event) => boolean
}

function makeWorker(state: ServiceWorkerState = 'installing'): FakeWorker {
  const target = new EventTarget()
  Object.assign(target, {
    state,
    scriptURL: '/sw.js',
    postMessage: vi.fn(),
  })
  return target as unknown as FakeWorker
}

function makeRegistration(
  overrides: Partial<FakeRegistration> = {}
): FakeRegistration {
  const target = new EventTarget()
  // Object.assign mutates `target` in place — preserves the EventTarget
  // prototype methods (addEventListener / removeEventListener / dispatchEvent)
  // that the registration API expects.
  Object.assign(target, {
    active: null as FakeWorker | null,
    installing: null as FakeWorker | null,
    waiting: null as FakeWorker | null,
    scope: '/',
    update: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(true),
  })
  Object.assign(target, overrides)
  return target as unknown as FakeRegistration
}

function makeServiceWorkerContainer(registration: FakeRegistration) {
  const container = {
    controller: null as FakeWorker | null,
    ready: Promise.resolve(registration as unknown as ServiceWorkerRegistration),
    register: vi.fn().mockResolvedValue(registration),
    getRegistration: vi.fn().mockResolvedValue(registration),
    getRegistrations: vi.fn().mockResolvedValue([registration]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    startMessages: vi.fn(),
  }
  return container
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */
describe('registerServiceWorker', () => {
  const originalSW = navigator.serviceWorker

  afterEach(() => {
    // restore the real (jsdom) container between tests
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: originalSW,
    })
  })

  test('returns null when window is unavailable (SSR guard)', async () => {
    vi.stubGlobal('window', undefined)

    const result = await registerServiceWorker()

    expect(result).toBeNull()

    vi.unstubAllGlobals()
  })

  test('returns null when serviceWorker API is not available', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    const result = await registerServiceWorker()

    expect(result).toBeNull()
  })

  test('registers the service worker with the default script url and scope', async () => {
    const reg = makeRegistration({ active: makeWorker('activated') })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    const result = await registerServiceWorker()

    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(result).not.toBeNull()
    expect(result?.registration).toBe(reg)
    expect(result?.hasUpdate).toBe(false)
  })

  test('honors a custom scriptUrl', async () => {
    const reg = makeRegistration()
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    await registerServiceWorker({ scriptUrl: '/custom-sw.js' })

    expect(container.register).toHaveBeenCalledWith('/custom-sw.js', {
      scope: '/',
    })
  })

  test('fires onOfflineReady when the worker is already active', async () => {
    const reg = makeRegistration({ active: makeWorker('activated') })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    const onOfflineReady = vi.fn()
    await registerServiceWorker({ onOfflineReady })

    expect(onOfflineReady).toHaveBeenCalledTimes(1)
  })

  test('does not fire onOfflineReady when there is no active worker', async () => {
    const reg = makeRegistration({ active: null })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    const onOfflineReady = vi.fn()
    await registerServiceWorker({ onOfflineReady })

    expect(onOfflineReady).not.toHaveBeenCalled()
  })

  test('fires onNeedRefresh when an update is waiting at registration time', async () => {
    const reg = makeRegistration({
      active: makeWorker('activated'),
      waiting: makeWorker('installed'),
    })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    const onNeedRefresh = vi.fn()
    const result = await registerServiceWorker({ onNeedRefresh })

    expect(onNeedRefresh).toHaveBeenCalledTimes(1)
    expect(result?.hasUpdate).toBe(true)
  })

  test('fires onNeedRefresh when the installing worker reaches installed state', async () => {
    const installing = makeWorker('installing')
    const reg = makeRegistration({
      active: makeWorker('activated'),
      installing,
    })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    // Make controller truthy so the statechange handler treats this as an update.
    container.controller = makeWorker('activated')

    const onNeedRefresh = vi.fn()
    await registerServiceWorker({ onNeedRefresh })

    expect(onNeedRefresh).not.toHaveBeenCalled()

    // Simulate the worker finishing install.
    installing.state = 'installed'
    installing.dispatchEvent(new Event('statechange'))

    expect(onNeedRefresh).toHaveBeenCalledTimes(1)
  })

  test('does not fire onNeedRefresh on statechange when there is no controller', async () => {
    const installing = makeWorker('installing')
    const reg = makeRegistration({
      active: null,
      installing,
    })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })
    container.controller = null

    const onNeedRefresh = vi.fn()
    await registerServiceWorker({ onNeedRefresh })

    installing.state = 'installed'
    installing.dispatchEvent(new Event('statechange'))

    expect(onNeedRefresh).not.toHaveBeenCalled()
  })

  test('returns null and warns when registration throws', async () => {
    const container = {
      ...makeServiceWorkerContainer(makeRegistration()),
      register: vi.fn().mockRejectedValue(new Error('boom')),
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = await registerServiceWorker()

    expect(result).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('applyServiceWorkerUpdate', () => {
  const originalSW = navigator.serviceWorker

  beforeEach(() => {
    // no-op; tests below install their own container
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: originalSW,
    })
  })

  test('posts SKIP_WAITING to the waiting worker', async () => {
    const waiting = makeWorker('installed')
    waiting.postMessage = vi.fn()
    const reg = makeRegistration({ waiting })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    applyServiceWorkerUpdate()

    await new Promise((r) => setTimeout(r, 0))
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  test('is a no-op when no registration exists', async () => {
    const waiting = makeWorker('installed')
    const container = makeServiceWorkerContainer(makeRegistration())
    container.getRegistration = vi.fn().mockResolvedValue(null)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    expect(() => applyServiceWorkerUpdate()).not.toThrow()
    // Should never reach waiting.postMessage on this path
    expect(waiting.postMessage).not.toHaveBeenCalled()
  })

  test('is a no-op when no waiting worker exists', async () => {
    const reg = makeRegistration({ waiting: null })
    const container = makeServiceWorkerContainer(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: container,
    })

    expect(() => applyServiceWorkerUpdate()).not.toThrow()
  })

  test('is a no-op when serviceWorker is unavailable', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    expect(() => applyServiceWorkerUpdate()).not.toThrow()
  })
})

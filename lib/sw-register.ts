/**
 * Kahi Music — Service Worker registration helper
 *
 * Pure logic. Safe to import in SSR — the helpers short-circuit when
 * `navigator` or `navigator.serviceWorker` is not available.
 */

export interface ServiceWorkerRegistrationResult {
  /** The active service worker registration, or null if unsupported / not yet active. */
  registration: ServiceWorkerRegistration | null
  /** Whether a new worker is installing. */
  hasUpdate: boolean
}

export interface RegisterOptions {
  /** Path to the service worker file, defaults to `/sw.js`. */
  scriptUrl?: string
  /** Called once when a new service worker is found installing. */
  onNeedRefresh?: () => void
  /** Called once when the new worker has activated and taken control. */
  onOfflineReady?: () => void
}

/**
 * Register the Kahi service worker.
 *
 * - No-op when called on the server.
 * - No-op when the runtime does not expose `navigator.serviceWorker`.
 * - Listens to `updatefound` and surfaces a `onNeedRefresh` callback.
 * - Sends `{ type: 'SKIP_WAITING' }` when a new worker activates.
 */
export async function registerServiceWorker(
  options: RegisterOptions = {}
): Promise<ServiceWorkerRegistrationResult | null> {
  if (typeof window === 'undefined') return null
  if (!navigator.serviceWorker) return null

  const { scriptUrl = '/sw.js', onNeedRefresh, onOfflineReady } = options

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: '/',
    })

    if (registration.active) {
      onOfflineReady?.()
    }

    if (registration.installing) {
      trackInstallingWorker(registration.installing, onNeedRefresh)
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      trackInstallingWorker(newWorker, onNeedRefresh)
    })

    // Replay: if a worker is already waiting (e.g. on a refresh), surface it.
    if (registration.waiting) {
      onNeedRefresh?.()
    }

    return { registration, hasUpdate: Boolean(registration.waiting) }
  } catch (error) {
    // Surface as a warning — SW registration failures should never break the app.
    console.warn('[sw] registration failed', error)
    return null
  }
}

function trackInstallingWorker(
  worker: ServiceWorker,
  onNeedRefresh?: () => void
): void {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      onNeedRefresh?.()
    }
  })
}

/**
 * Ask the waiting service worker (if any) to take control of the page
 * by sending a `SKIP_WAITING` message. The new worker will activate on
 * the next event loop tick.
 */
export function applyServiceWorkerUpdate(): void {
  if (typeof window === 'undefined') return
  if (!navigator.serviceWorker) return
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (!registration || !registration.waiting) return
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  })
}

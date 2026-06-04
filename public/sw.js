/* eslint-disable */
/**
 * Kahi Music — Service Worker
 *
 * Cache strategies:
 *   - HTML / JS / CSS: stale-while-revalidate
 *   - Images:          cache-first (separate "img-cache" bucket)
 *   - API GET:         network-first with a 5s timeout, fallback to cache
 *
 * Lifecycle:
 *   - install: precache the offline shell
 *   - activate: drop any cache not in the current allow-list
 *   - fetch: dispatch to the right strategy by request shape
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `kahi-static-${CACHE_VERSION}`
const IMAGE_CACHE = `img-cache-${CACHE_VERSION}`
const API_CACHE = `kahi-api-${CACHE_VERSION}`

const PRECACHE_URLS = ['/', '/offline', '/manifest.json']
const PRIVATE_API_PATHS = [
  '/api/user',
  '/api/login',
  '/api/likelist',
  '/api/recommend/songs',
  '/api/user/cloud',
]

/* ------------------------------------------------------------------ *
 * Install
 * ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      // addAll fails the whole install if any URL 404s; fall back to best-effort.
      try {
        await cache.addAll(PRECACHE_URLS)
      } catch (err) {
        console.warn('[sw] precache partial failure', err)
        await Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => undefined)
          )
        )
      }
      await self.skipWaiting()
    })()
  )
})

/* ------------------------------------------------------------------ *
 * Activate
 * ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  const allowed = new Set([STATIC_CACHE, IMAGE_CACHE, API_CACHE])
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => !allowed.has(key))
          .map((key) => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

/* ------------------------------------------------------------------ *
 * Fetch routing
 * ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) {
    return
  }

  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  if (isPrivateApiRequest(url)) {
    event.respondWith(networkOnly(request))
    return
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE, 5000))
    return
  }

  if (isStaticAsset(request) || request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }
})

/* ------------------------------------------------------------------ *
 * Strategies
 * ------------------------------------------------------------------ */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)
  return cached || (await networkPromise) || offlineFallback(request)
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return cached || offlineFallback(request)
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request)
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' })
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName)
  try {
    const response = await raceWithTimeout(request, timeoutMs)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await cache.match(request)
    return cached || offlineFallback(request)
  }
}

/**
 * Race a fetch against a timeout using AbortController.
 * If the timer fires first, the underlying fetch is cancelled via
 * `controller.abort()` — preventing the network from continuing to load
 * a response we will no longer consume.
 */
function raceWithTimeout(request, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(request, { signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

async function offlineFallback(request) {
  if (request.mode === 'navigate') {
    const cache = await caches.open(STATIC_CACHE)
    const offline = await cache.match('/offline')
    if (offline) return offline
  }
  return new Response('', { status: 504, statusText: 'Offline' })
}

/* ------------------------------------------------------------------ *
 * Classifiers
 * ------------------------------------------------------------------ */
function isImageRequest(request) {
  const dest = request.destination
  if (dest === 'image') return true
  return /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)(\?.*)?$/i.test(request.url)
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isPrivateApiRequest(url) {
  return PRIVATE_API_PATHS.some((path) => {
    if (path === '/api/likelist' || path === '/api/recommend/songs') {
      return url.pathname === path
    }
    return url.pathname === path || url.pathname.startsWith(`${path}/`)
  })
}

function isStaticAsset(request) {
  const dest = request.destination
  return dest === 'script' || dest === 'style' || dest === 'font' || dest === 'worker'
}

/* ------------------------------------------------------------------ *
 * Message channel — allow the page to ask the SW to skipWaiting
 * ------------------------------------------------------------------ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

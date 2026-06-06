/* eslint-disable */
/**
 * Kahi Music — Service Worker
 *
 * Cache strategies:
 *   - HTML / JS / CSS: stale-while-revalidate
 *   - Images:          cache-first (separate "img-cache" bucket)
 *   - API GET:         network-only + no-store by default
 *   - Public API GET:  allow-listed, credential-free requests may use cache
 *
 * Lifecycle:
 *   - install: precache the offline shell
 *   - activate: drop any cache not in the current allow-list
 *   - fetch: dispatch to the right strategy by request shape
 */

const CACHE_VERSION = 'v3'
const STATIC_CACHE = `kahi-static-${CACHE_VERSION}`
const IMAGE_CACHE = `img-cache-${CACHE_VERSION}`
const API_CACHE = `kahi-api-public-${CACHE_VERSION}`

const PRECACHE_URLS = ['/', '/offline', '/manifest.json']
const CACHEABLE_PUBLIC_API_PATHS = [
  '/api/banner',
  '/api/search/hot',
  '/api/search/default',
  '/api/toplist',
  '/api/toplist/detail',
  '/api/playlist/catalog/playlist',
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
          .filter((key) => shouldDeleteCache(key, allowed))
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
  if (url.origin !== self.location.origin) return

  if (isApiRequest(url)) {
    if (isCacheablePublicApiRequest(request, url)) {
      event.respondWith(networkFirst(request, API_CACHE, 5000))
    } else {
      event.respondWith(networkOnlyNoStore(request))
    }
    return
  }

  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
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

async function networkOnlyNoStore(request) {
  try {
    return await fetch(request, { cache: 'no-store' })
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' })
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName)
  try {
    const response = await raceWithTimeout(request, timeoutMs)
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone()).catch((err) => {
        console.warn('[sw] failed to cache public API response', err)
      })
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
  return fetch(request, { cache: 'no-store', signal: controller.signal })
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

function isCacheablePublicApiRequest(request, url) {
  return request.credentials === 'omit'
    && CACHEABLE_PUBLIC_API_PATHS.includes(url.pathname)
}

function isCacheableResponse(response) {
  if (!response || !response.ok) return false
  const cacheControl = response.headers.get('Cache-Control') || ''
  return !/(^|,)\s*(no-store|private)\b/i.test(cacheControl)
}

function isStaticAsset(request) {
  const dest = request.destination
  return dest === 'script' || dest === 'style' || dest === 'font' || dest === 'worker'
}

function shouldDeleteCache(key, allowed) {
  if (key.startsWith('kahi-api-') && key !== API_CACHE) return true
  return !allowed.has(key)
}

/* ------------------------------------------------------------------ *
 * Message channel — allow the page to ask the SW to skipWaiting
 * ------------------------------------------------------------------ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

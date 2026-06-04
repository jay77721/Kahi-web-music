import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface FetchEventInit {
  request: Request
}

class FakeFetchEvent extends Event {
  request: Request
  responsePromise: Promise<Response> | null = null

  constructor({ request }: FetchEventInit) {
    super('fetch')
    this.request = request
  }

  respondWith(response: Promise<Response> | Response) {
    this.responsePromise = Promise.resolve(response)
  }
}

function makeCaches() {
  const stores = new Map<string, Map<string, Response>>()
  const putCalls: string[] = []

  return {
    putCalls,
    async keys() {
      return [...stores.keys()]
    },
    async delete(key: string) {
      return stores.delete(key)
    },
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!

      return {
        async add(url: string) {
          store.set(url, new Response(`cached:${url}`))
        },
        async addAll(urls: string[]) {
          urls.forEach((url) => store.set(url, new Response(`cached:${url}`)))
        },
        async match(request: Request | string) {
          const key = typeof request === 'string' ? request : request.url
          return store.get(key)
        },
        async put(request: Request | string, response: Response) {
          const key = typeof request === 'string' ? request : request.url
          putCalls.push(key)
          store.set(key, response)
        },
      }
    },
  }
}

describe('service worker cache strategies', () => {
  const originalFetch = globalThis.fetch
  const originalCaches = globalThis.caches
  const originalLocation = globalThis.location
  let fetchListener: ((event: FakeFetchEvent) => void) | undefined
  let cachesMock: ReturnType<typeof makeCaches>

  beforeEach(() => {
    fetchListener = undefined
    cachesMock = makeCaches()

    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: cachesMock,
    })
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('https://kahi.test/'),
    })
    Object.assign(globalThis, {
      clients: { claim: vi.fn() },
      skipWaiting: vi.fn(),
      addEventListener: vi.fn((type: string, listener: unknown) => {
        if (type === 'fetch') {
          fetchListener = listener as (event: FakeFetchEvent) => void
        }
      }),
    })

    const source = readFileSync(
      resolve(process.cwd(), 'public/sw.js'),
      'utf-8'
    )
    new Function(source).call(globalThis)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    })
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: originalCaches,
    })
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  test('caches successful public API GET responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('public')))
    const request = new Request('https://kahi.test/api/song/detail?id=1')
    const event = new FakeFetchEvent({ request })

    fetchListener?.(event)
    const response = await event.responsePromise

    expect(await response?.text()).toBe('public')
    expect(cachesMock.putCalls).toContain(request.url)
  })

  test.each([
    '/api/user/account',
    '/api/login/status',
    '/api/likelist',
    '/api/recommend/songs',
    '/api/user/cloud',
  ])('does not cache private API response for %s', async (path) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private')))
    const request = new Request(`https://kahi.test${path}`)
    const event = new FakeFetchEvent({ request })

    fetchListener?.(event)
    const response = await event.responsePromise

    expect(await response?.text()).toBe('private')
    expect(cachesMock.putCalls).not.toContain(request.url)
  })

  test('returns cached offline page for failed navigation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const staticCache = await cachesMock.open('kahi-static-v1')
    await staticCache.put('/offline', new Response('offline page'))
    const request = new Request('https://kahi.test/library')
    Object.defineProperty(request, 'mode', { value: 'navigate' })
    const event = new FakeFetchEvent({ request })

    fetchListener?.(event)
    const response = await event.responsePromise

    expect(await response?.text()).toBe('offline page')
  })
})

/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import React from 'react';

// Register jest-dom matchers FIRST (before any mocks or tests run)
import '@testing-library/jest-dom/vitest';

// --- Global next/navigation mock (components use usePathname, useRouter, etc.) ---
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// --- DOM mocks (only in browser-like environments) ---
if (typeof window !== 'undefined') {
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock localStorage with Proxy so Object.keys() / clear() works
  const storeInternal: Record<string, string> = {}
  const localStorageProxy = new Proxy({}, {
    get: (_, prop: string | symbol) => {
      if (prop === 'getItem') return (key: string) => storeInternal[key] ?? null
      if (prop === 'setItem') return (key: string, value: string) => { storeInternal[key] = String(value) }
      if (prop === 'removeItem') return (key: string) => { delete storeInternal[key] }
      if (prop === 'clear') return () => { Object.keys(storeInternal).forEach(k => delete storeInternal[k]) }
      if (prop === 'get length') return () => Object.keys(storeInternal).length
      if (prop === 'key') return (index: number) => Object.keys(storeInternal)[index] ?? null
      if (prop === Symbol.toStringTag) return 'Storage'
      return undefined
    },
    has: (_, prop: string) => ['getItem', 'setItem', 'removeItem', 'clear', 'length', 'key'].includes(prop),
    ownKeys: () => Object.keys(storeInternal),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true, writable: true, value: undefined }),
  })

  Object.defineProperty(window, 'localStorage', { value: localStorageProxy });
  Object.defineProperty(window, 'sessionStorage', { value: localStorageProxy });
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
}

// --- Global mocks (safe in both node and jsdom) ---
const MockIntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  takeRecords() { return [] as unknown[]; }
} as unknown as typeof IntersectionObserver;

globalThis.IntersectionObserver = MockIntersectionObserver

globalThis.ResizeObserver = class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {};
};

if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [] as Animation[]
}

// --- Module mocks ---
vi.mock('howler', () => ({
  default: {
    Howl: vi.fn().mockImplementation(() => ({
      load: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      volume: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      unload: vi.fn(),
      playing: false,
      state: 'unloaded',
    })),
  },
  Howl: vi.fn(),
  Howler: { ctx: null, masterGain: { gain: { value: 1 } }, usingWebAudio: false, autoSuspend: true },
}));

vi.mock('swr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('swr')>()
  const cache = new Map<string, { data?: unknown; error?: unknown; isValidating?: boolean; isLoading?: boolean }>()
  const mutate = vi.fn(async (key: string, data?: unknown) => {
    const entry = cache.get(key) ?? {}
    entry.data = data
    cache.set(key, entry)
    return data
  })

  return {
    ...actual,
    default: () => ({
      data: [],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    }),
    useSWRConfig: () => ({ cache, mutate }),
    mutate,
  }
});

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { src?: string | { src?: string } }) => {
    const imageProps = { ...props } as Record<string, unknown>
    const src = imageProps.src
    const alt = imageProps.alt

    delete imageProps.fill
    delete imageProps.loader
    delete imageProps.priority
    delete imageProps.quality
    delete imageProps.unoptimized
    delete imageProps.placeholder
    delete imageProps.blurDataURL

    return React.createElement('img', {
      ...imageProps,
      src: typeof src === 'string' ? src : (src as { src?: string } | undefined)?.src ?? '',
      alt: typeof alt === 'string' ? alt : '',
    })
  },
}));

type MockNextLinkHref = string | URL | { pathname?: string }
type MockNextLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: MockNextLinkHref
}

function resolveMockNextLinkHref(href: MockNextLinkHref) {
  if (typeof href === 'string') return href
  if (href instanceof URL) return href.toString()
  return href.pathname ?? '#'
}

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: MockNextLinkProps) =>
    React.createElement(
      'a',
      { href: resolveMockNextLinkHref(href), ...rest },
      children
    ),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: () => (props: { children?: React.ReactNode } & Record<string, unknown>) => {
      const { children, ...rest } = props;
      return React.createElement('div', { 'data-framer-motion': 'true', ...(rest as React.HTMLAttributes<HTMLDivElement>) }, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

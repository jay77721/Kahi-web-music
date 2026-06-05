import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import HomePage from '@/app/page'

type MockDynamicComponent = React.ComponentType<Record<string, unknown>>
type MockDynamicModule = unknown

const homeState = vi.hoisted(() => ({
  observerCallback: null as IntersectionObserverCallback | null,
  observerOptions: null as IntersectionObserverInit | null,
  bentoGridModuleLoaded: vi.fn(),
}))

vi.mock('next/dynamic', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react')

  return {
    default: (
      loader: () => Promise<MockDynamicModule>,
      options?: { loading?: MockDynamicComponent }
    ) => {
      function DynamicComponent(props: Record<string, unknown>) {
        const [Resolved, setResolved] = ReactActual.useState<MockDynamicComponent | null>(null)

        ReactActual.useEffect(() => {
          let active = true

          void loader().then((loaded) => {
            const Component =
              loaded &&
              typeof loaded === 'object' &&
              'default' in loaded
                ? (loaded as { default: MockDynamicComponent }).default
                : (loaded as MockDynamicComponent)
            if (active) setResolved(() => Component)
          })

          return () => {
            active = false
          }
        }, [])

        if (!Resolved) {
          const Loading = options?.loading
          return Loading ? ReactActual.createElement(Loading, props) : null
        }

        return ReactActual.createElement(Resolved, props)
      }

      return DynamicComponent
    },
  }
})

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

vi.mock('@/components/discover/RecentPlayed', () => ({
  RecentPlayed: () => React.createElement('section', { 'data-testid': 'recent-played' }),
}))

vi.mock('@/components/discover/Banner', () => ({
  Banner: () => React.createElement('section', { 'data-testid': 'banner' }),
}))

vi.mock('@/components/discover/BentoGrid', () => {
  homeState.bentoGridModuleLoaded()
  return {
    BentoGrid: () => React.createElement('section', { 'data-testid': 'bento-grid' }),
  }
})

describe('HomePage', () => {
  beforeEach(() => {
    homeState.observerCallback = null
    homeState.observerOptions = null
    homeState.bentoGridModuleLoaded.mockClear()

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        homeState.observerCallback = callback
        homeState.observerOptions = options ?? null
      }

      observe = vi.fn()
      disconnect = vi.fn()
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  test('defers the bento grid module until its section approaches the viewport', async () => {
    const { container } = render(<HomePage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('recent-played')).toBeInTheDocument()
    expect(screen.getByTestId('banner')).toBeInTheDocument()
    expect(screen.queryByTestId('bento-grid')).toBeNull()
    expect(homeState.bentoGridModuleLoaded).not.toHaveBeenCalled()
    expect(homeState.observerOptions).toEqual({ rootMargin: '0px 0px -25% 0px' })
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()

    await act(async () => {
      homeState.observerCallback?.(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        { disconnect: vi.fn() } as unknown as IntersectionObserver
      )
    })

    expect(await screen.findByTestId('bento-grid')).toBeInTheDocument()
    expect(homeState.bentoGridModuleLoaded).toHaveBeenCalledTimes(1)
  })
})

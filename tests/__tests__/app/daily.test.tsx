'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import React from 'react'
import type { Song } from '@/types/song'

type MockDynamicComponent = React.ComponentType<Record<string, unknown>>
type MockDynamicModule = unknown

const mockRouterReplace = vi.fn()
const mockUseUserStore = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseSWR = vi.fn()
const mockMutate = vi.fn()
const mockRestore = vi.fn()
const mockPlayQueue = vi.fn()
const mockRecommendSongs = vi.fn()
const mockNormalizeSongList = vi.fn()

const mockSWRModuleLoaded = vi.fn()
const mockLucideModuleLoaded = vi.fn()
const mockAppShellModuleLoaded = vi.fn()
const mockSongTableModuleLoaded = vi.fn()
const mockDailyHeroModuleLoaded = vi.fn()
const mockPlayerStoreModuleLoaded = vi.fn()
const mockApiModuleLoaded = vi.fn()
const mockAdaptersModuleLoaded = vi.fn()

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

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace, back: vi.fn() }),
  }
})

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => mockUseUserStore(),
}))

vi.mock('swr', () => {
  mockSWRModuleLoaded()
  return {
    default: (...args: unknown[]) => mockUseSWR(...args),
  }
})

vi.mock('lucide-react', () => {
  mockLucideModuleLoaded()
  const Icon = (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement('svg', { ...props, 'data-testid': 'daily-icon' })
  return {
    Play: Icon,
    RefreshCw: Icon,
  }
})

vi.mock('@/components/layout/AppShell', () => {
  mockAppShellModuleLoaded()
  return {
    AppShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'app-shell' }, children),
  }
})

vi.mock('@/components/common/SongTable', () => {
  mockSongTableModuleLoaded()
  return {
    SongTable: ({
      songs,
      onPlayAll,
    }: {
      songs: Song[]
      onPlayAll?: () => void
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'song-table', 'data-count': String(songs.length) },
        React.createElement(
          'button',
          { type: 'button', 'data-testid': 'song-table-play-all', onClick: onPlayAll },
          'play table'
        )
      ),
  }
})

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement('div', { ...props, 'data-testid': 'daily-skeleton' }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string
    size?: string
  }) => React.createElement('button', props, children),
}))

vi.mock('@/components/discover/DailyHero', () => {
  mockDailyHeroModuleLoaded()
  return {
    DailyHero: () => React.createElement('section', { 'data-testid': 'daily-hero' }),
  }
})

vi.mock('@/lib/api', () => {
  mockApiModuleLoaded()
  return {
    ncmApi: {
      recommendSongs: (...args: unknown[]) => mockRecommendSongs(...args),
    },
  }
})

vi.mock('@/lib/api-adapters', () => {
  mockAdaptersModuleLoaded()
  return {
    normalizeSongList: (...args: unknown[]) => mockNormalizeSongList(...args),
  }
})

vi.mock('@/stores/playerStore', () => {
  mockPlayerStoreModuleLoaded()
  return {
    usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? mockUsePlayerStore(selector) : (mockUsePlayerStore() ?? makePlayerStore()),
  }
})

function makeUserStore(
  overrides: Partial<{
    isLoggedIn: boolean
    profile: unknown
    hasRestoredSession: boolean
    restore: () => Promise<void>
  }> = {}
) {
  return {
    isLoggedIn: true,
    profile: { userId: 1001, nickname: 'Daily Tester' },
    hasRestoredSession: true,
    restore: mockRestore,
    ...overrides,
  }
}

function makePlayerStore() {
  return { playQueue: mockPlayQueue }
}

function makeSong(id: number): Song {
  return {
    id,
    name: `Daily Song ${id}`,
    ar: [{ id, name: `Artist ${id}` }],
    al: { id, name: `Album ${id}`, picUrl: `https://example.com/${id}.jpg` },
    dt: 200000,
    publishTime: 0,
    noCopyrightRcmd: null,
    mv: 0,
  }
}

function makeSongList(count = 2) {
  return Array.from({ length: count }, (_, index) => makeSong(index + 1))
}

function mockUserStore(overrides = {}) {
  mockUseUserStore.mockReturnValue(makeUserStore(overrides))
}

function expectProtectedResourcesIdle() {
  expect(mockSWRModuleLoaded).not.toHaveBeenCalled()
  expect(mockLucideModuleLoaded).not.toHaveBeenCalled()
  expect(mockAppShellModuleLoaded).not.toHaveBeenCalled()
  expect(mockSongTableModuleLoaded).not.toHaveBeenCalled()
  expect(mockDailyHeroModuleLoaded).not.toHaveBeenCalled()
  expect(mockPlayerStoreModuleLoaded).not.toHaveBeenCalled()
  expect(mockApiModuleLoaded).not.toHaveBeenCalled()
  expect(mockAdaptersModuleLoaded).not.toHaveBeenCalled()
  expect(mockUseSWR).not.toHaveBeenCalled()
  expect(mockUsePlayerStore).not.toHaveBeenCalled()
  expect(mockRecommendSongs).not.toHaveBeenCalled()
  expect(mockNormalizeSongList).not.toHaveBeenCalled()
}

async function renderDailyPage() {
  const { default: DailyPage } = await import('@/app/daily/page')
  render(<DailyPage />)
}

describe('DailyPage', () => {
  beforeEach(() => {
    vi.resetModules()

    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseSWR.mockReset()
    mockMutate.mockReset()
    mockRestore.mockReset()
    mockPlayQueue.mockReset()
    mockRecommendSongs.mockReset()
    mockNormalizeSongList.mockReset()

    mockSWRModuleLoaded.mockReset()
    mockLucideModuleLoaded.mockReset()
    mockAppShellModuleLoaded.mockReset()
    mockSongTableModuleLoaded.mockReset()
    mockDailyHeroModuleLoaded.mockReset()
    mockPlayerStoreModuleLoaded.mockReset()
    mockApiModuleLoaded.mockReset()
    mockAdaptersModuleLoaded.mockReset()

    mockUserStore()
    mockUsePlayerStore.mockReturnValue(makePlayerStore())
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('renders a light gate while restoring the session without loading daily resources', async () => {
    mockUserStore({ hasRestoredSession: false, isLoggedIn: false, profile: null })

    await renderDailyPage()

    expect(screen.getByTestId('daily-session-loading')).toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expectProtectedResourcesIdle()
  })

  test('keeps stale logged-in state behind the light gate during session restore', async () => {
    mockUserStore({ hasRestoredSession: false, isLoggedIn: true })

    await renderDailyPage()

    expect(screen.getByTestId('daily-session-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expectProtectedResourcesIdle()
  })

  test('redirects anonymous users without loading daily resources', async () => {
    mockUserStore({ isLoggedIn: false, profile: null })

    await renderDailyPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.getByTestId('daily-auth-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
    expectProtectedResourcesIdle()
  })

  test('loads the full daily content only after authentication', async () => {
    await renderDailyPage()

    expect(screen.getByTestId('daily-content-loading')).toBeInTheDocument()
    expect(await screen.findByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('daily-hero')).toBeInTheDocument()
    expect(screen.getByTestId('daily-loading')).toBeInTheDocument()
    expect(mockSWRModuleLoaded).toHaveBeenCalledTimes(1)
    expect(mockLucideModuleLoaded).toHaveBeenCalledTimes(1)
    expect(mockAppShellModuleLoaded).toHaveBeenCalledTimes(1)
    expect(mockDailyHeroModuleLoaded).toHaveBeenCalledTimes(1)
    expect(mockPlayerStoreModuleLoaded).toHaveBeenCalledTimes(1)
    expect(mockUseSWR).toHaveBeenCalledWith(
      'recommend-songs',
      expect.any(Function),
      expect.objectContaining({
        revalidateOnFocus: false,
        dedupingInterval: 60000,
      })
    )
  })

  test('fetches and normalizes daily recommendations after authentication', async () => {
    const rawSongs = [{ id: 1, name: 'raw song' }]
    const normalizedSongs = makeSongList()
    mockRecommendSongs.mockResolvedValue(rawSongs)
    mockNormalizeSongList.mockReturnValue(normalizedSongs)

    await renderDailyPage()

    await screen.findByTestId('app-shell')
    const fetcher = mockUseSWR.mock.calls[0][1] as () => Promise<Song[]>

    await expect(fetcher()).resolves.toEqual(normalizedSongs)
    expect(mockRecommendSongs).toHaveBeenCalledTimes(1)
    expect(mockNormalizeSongList).toHaveBeenCalledWith(rawSongs)
  })

  test('renders hero, song table, play all, and refresh for loaded recommendations', async () => {
    const songs = makeSongList(31)
    mockUseSWR.mockReturnValue({
      data: songs,
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    await renderDailyPage()

    expect(await screen.findByTestId('daily-hero')).toBeInTheDocument()
    expect(screen.getByTestId('song-table')).toHaveAttribute('data-count', '30')

    fireEvent.click(screen.getByTestId('daily-play-all'))
    expect(mockPlayQueue).toHaveBeenCalledWith(songs.slice(0, 30), 0)

    fireEvent.click(screen.getByTestId('daily-refresh'))
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })
})

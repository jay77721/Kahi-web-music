'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import React from 'react'
import type { UserProfile } from '@/types/user'

type MockDynamicComponent = React.ComponentType<Record<string, unknown>>
type MockDynamicModule = unknown

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockUseUserStore = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseDominantColor = vi.fn()
const mockUseSWR = vi.fn()
const mockMutate = vi.fn()

const mockSWRModuleLoaded = vi.fn()
const mockAppShellModuleLoaded = vi.fn()
const mockSongTableModuleLoaded = vi.fn()
const mockDominantColorModuleLoaded = vi.fn()
const mockPlayerStoreModuleLoaded = vi.fn()

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
    useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, back: vi.fn() }),
  }
})

vi.mock('swr', () => {
  mockSWRModuleLoaded()
  return {
    default: (...args: unknown[]) => mockUseSWR(...args),
  }
})

vi.mock('@/hooks/useDominantColor', () => {
  mockDominantColorModuleLoaded()
  return {
    useDominantColor: (...args: unknown[]) => mockUseDominantColor(...args),
  }
})

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseUserStore(selector) : (mockUseUserStore() ?? makeUserStore()),
}))

vi.mock('@/stores/playerStore', () => {
  mockPlayerStoreModuleLoaded()
  return {
    usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? mockUsePlayerStore(selector) : (mockUsePlayerStore() ?? makePlayerStore()),
  }
})

vi.mock('@/lib/api', () => ({
  ncmApi: {
    userCloud: vi.fn(),
  },
}))

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
    SongTable: ({ songs }: { songs: { id: number; name: string }[] }) =>
      React.createElement(
        'div',
        { 'data-testid': 'song-table' },
        `songs:${songs.length}`
      ),
  }
})

vi.mock('@/components/player/PlayerBar', () => ({ PlayerBar: () => null }))
vi.mock('@/components/player/MiniPlayer', () => ({ MiniPlayer: () => null }))
vi.mock('@/components/player/FullScreenPlayer', () => ({ FullScreenPlayer: () => null }))
vi.mock('@/components/player/PlayQueue', () => ({ PlayQueue: () => null }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockRestore = vi.fn()

const FAKE_PROFILE: UserProfile = {
  userId: 2002,
  nickname: 'Cloud Tester',
  avatarUrl: 'https://example.com/avatar.jpg',
  signature: 'Cloud collector',
  level: 7,
  vipType: 0,
  follows: 8,
  followeds: 21,
  listenSongs: 6789,
}

function makeUserStore(
  overrides: Partial<{
    isLoggedIn: boolean
    profile: UserProfile | null
    hasRestoredSession: boolean
    restore: () => Promise<void>
  }> = {}
) {
  return {
    isLoggedIn: true,
    profile: FAKE_PROFILE,
    hasRestoredSession: true,
    restore: mockRestore,
    ...overrides,
  }
}

function makePlayerStore() {
  return { playQueue: vi.fn() }
}

function makeSongList() {
  return [
    {
      id: 1,
      name: 'Cloud Song 1',
      ar: [{ id: 1, name: 'Artist A' }],
      al: { id: 1, name: 'Album A', picUrl: 'https://example.com/a.jpg' },
      dt: 200000,
    },
    {
      id: 2,
      name: 'Cloud Song 2',
      ar: [{ id: 2, name: 'Artist B' }],
      al: { id: 2, name: 'Album B', picUrl: 'https://example.com/b.jpg' },
      dt: 250000,
    },
  ]
}

function mockUserStore(overrides = {}) {
  mockUseUserStore.mockImplementation((selector) =>
    selector
      ? selector(makeUserStore(overrides) as unknown as Record<string, unknown>)
      : makeUserStore(overrides)
  )
}

function expectProtectedResourcesIdle() {
  expect(mockSWRModuleLoaded).not.toHaveBeenCalled()
  expect(mockAppShellModuleLoaded).not.toHaveBeenCalled()
  expect(mockSongTableModuleLoaded).not.toHaveBeenCalled()
  expect(mockDominantColorModuleLoaded).not.toHaveBeenCalled()
  expect(mockPlayerStoreModuleLoaded).not.toHaveBeenCalled()
  expect(mockUseSWR).not.toHaveBeenCalled()
  expect(mockUseDominantColor).not.toHaveBeenCalled()
  expect(mockUsePlayerStore).not.toHaveBeenCalled()
}

async function renderCloudPage() {
  const { default: CloudPage } = await import('@/app/cloud/page')
  render(<CloudPage />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CloudPage', () => {
  beforeEach(() => {
    vi.resetModules()

    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseDominantColor.mockReset()
    mockUseSWR.mockReset()
    mockMutate.mockReset()
    mockRestore.mockReset()
    mockSWRModuleLoaded.mockReset()
    mockAppShellModuleLoaded.mockReset()
    mockSongTableModuleLoaded.mockReset()
    mockDominantColorModuleLoaded.mockReset()
    mockPlayerStoreModuleLoaded.mockReset()

    mockUserStore()
    mockUsePlayerStore.mockImplementation((selector) =>
      selector
        ? selector(makePlayerStore() as unknown as Record<string, unknown>)
        : makePlayerStore()
    )
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
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

  test('renders a light gate while restoring the session without loading protected resources', async () => {
    mockUserStore({ hasRestoredSession: false, isLoggedIn: false, profile: null })

    await renderCloudPage()

    expect(screen.getByTestId('cloud-session-loading')).toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expectProtectedResourcesIdle()
  })

  test('keeps the light gate first when a stale logged-in flag exists during restore', async () => {
    mockUserStore({ hasRestoredSession: false, isLoggedIn: true, profile: FAKE_PROFILE })

    await renderCloudPage()

    expect(screen.getByTestId('cloud-session-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('cloud-page')).not.toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expectProtectedResourcesIdle()
  })

  test('redirects to /login when user is not logged in without loading protected resources', async () => {
    mockUserStore({ isLoggedIn: false, profile: null })

    await renderCloudPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.getByTestId('cloud-auth-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('cloud-page')).not.toBeInTheDocument()
    expectProtectedResourcesIdle()
  })

  test('renders skeleton while loading after authentication', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: mockMutate,
    })

    await renderCloudPage()

    expect(await screen.findByTestId('app-shell', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('cloud-page')).toBeInTheDocument()
    expect(screen.getByRole('heading')).toBeInTheDocument()
    expect(screen.getByTestId('cloud-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cloud-error')).not.toBeInTheDocument()
    expect(mockSongTableModuleLoaded).not.toHaveBeenCalled()
  })

  test('renders error state with retry button', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      mutate: mockMutate,
    })

    await renderCloudPage()

    expect(await screen.findByTestId('cloud-error')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(mockSongTableModuleLoaded).not.toHaveBeenCalled()
  })

  test('retry button triggers mutate', async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Boom'),
      mutate: mockMutate,
    })

    await renderCloudPage()

    fireEvent.click(await screen.findByRole('button'))
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  test('renders empty state when there are no songs', async () => {
    mockUseSWR.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    await renderCloudPage()

    expect(await screen.findByTestId('cloud-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('song-table')).not.toBeInTheDocument()
    expect(mockSongTableModuleLoaded).not.toHaveBeenCalled()
  })

  test('loads the song table only when songs are ready', async () => {
    mockUseSWR.mockReturnValue({
      data: makeSongList(),
      isLoading: false,
      error: undefined,
      mutate: mockMutate,
    })

    await renderCloudPage()

    expect(await screen.findByTestId('song-table')).toBeInTheDocument()
    expect(screen.getByTestId('song-table').textContent).toBe('songs:2')
    expect(mockSongTableModuleLoaded).toHaveBeenCalledTimes(1)
  })
})

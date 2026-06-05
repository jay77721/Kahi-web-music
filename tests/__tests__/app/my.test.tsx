'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
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
const mockUseHistoryStore = vi.fn()
const mockUseSearchParams = vi.fn()
const mockUseDominantColor = vi.fn()
const mockUseSWR = vi.fn()
const mockSWRMutate = vi.fn()
const mockRestore = vi.fn()

const mockSWRModuleLoaded = vi.fn()
const mockAppShellModuleLoaded = vi.fn()
const mockTabsModuleLoaded = vi.fn()
const mockProfileHeaderModuleLoaded = vi.fn()
const mockSongTableModuleLoaded = vi.fn()
const mockPlaylistGridModuleLoaded = vi.fn()
const mockPlayerStoreModuleLoaded = vi.fn()
const mockHistoryStoreModuleLoaded = vi.fn()
const mockDominantColorModuleLoaded = vi.fn()

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
    useSearchParams: () => mockUseSearchParams(),
  }
})

vi.mock('swr', () => {
  mockSWRModuleLoaded()
  return {
    default: (...args: unknown[]) => mockUseSWR(...args),
    mutate: (...args: unknown[]) => mockSWRMutate(...args),
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

vi.mock('@/stores/historyStore', () => {
  mockHistoryStoreModuleLoaded()
  return {
    useHistoryStore: (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? mockUseHistoryStore(selector) : (mockUseHistoryStore() ?? makeHistoryStore()),
  }
})

vi.mock('@/lib/api', () => ({
  ncmApi: {
    likelist: vi.fn(),
    songDetail: vi.fn(),
    recordRecentSong: vi.fn(),
    userPlaylist: vi.fn(),
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
    SongTable: () => React.createElement('div', { 'data-testid': 'song-table' }),
  }
})

vi.mock('@/components/playlist/PlaylistGrid', () => {
  mockPlaylistGridModuleLoaded()
  return {
    PlaylistGrid: () => React.createElement('div', { 'data-testid': 'playlist-grid' }),
  }
})

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-slot': 'skeleton', className }),
}))

vi.mock('@/components/ui/tabs', () => {
  mockTabsModuleLoaded()
  return {
    Tabs: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'tabs' }, children),
    TabsList: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { role: 'tablist' }, children),
    TabsTrigger: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) =>
      React.createElement(
        'button',
        { type: 'button', role: 'tab', 'data-value': value },
        children
      ),
    TabsContent: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) => React.createElement('div', { 'data-testid': `tab-content-${value}` }, children),
  }
})

// Mock the user/ProfileHeader to make the test more focused.
vi.mock('@/components/user/ProfileHeader', () => {
  mockProfileHeaderModuleLoaded()
  return {
    ProfileHeader: ({ user }: { user: UserProfile }) =>
      React.createElement(
        'div',
        { 'data-testid': 'profile-header' },
        user.nickname
      ),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_PROFILE: UserProfile = {
  userId: 1001,
  nickname: 'Kahi Tester',
  avatarUrl: 'https://example.com/avatar.jpg',
  signature: 'Living for music',
  level: 9,
  vipType: 0,
  follows: 12,
  followeds: 345,
  listenSongs: 12345,
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

function makeHistoryStore() {
  return { history: [], clear: vi.fn() }
}

function mockUserStore(
  overrides: Partial<{
    isLoggedIn: boolean
    profile: UserProfile | null
    hasRestoredSession: boolean
  }> = {}
) {
  mockUseUserStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector
      ? selector(makeUserStore(overrides) as unknown as Record<string, unknown>)
      : makeUserStore(overrides)
  )
}

function swrState<T>(
  overrides: Partial<{ data: T; error: unknown; isLoading: boolean; mutate: () => void }> = {}
) {
  return {
    data: undefined as T | undefined,
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    ...overrides,
  }
}

function expectProtectedResourcesIdle() {
  expect(mockSWRModuleLoaded).not.toHaveBeenCalled()
  expect(mockAppShellModuleLoaded).not.toHaveBeenCalled()
  expect(mockTabsModuleLoaded).not.toHaveBeenCalled()
  expect(mockProfileHeaderModuleLoaded).not.toHaveBeenCalled()
  expect(mockSongTableModuleLoaded).not.toHaveBeenCalled()
  expect(mockPlaylistGridModuleLoaded).not.toHaveBeenCalled()
  expect(mockPlayerStoreModuleLoaded).not.toHaveBeenCalled()
  expect(mockHistoryStoreModuleLoaded).not.toHaveBeenCalled()
  expect(mockDominantColorModuleLoaded).not.toHaveBeenCalled()
  expect(mockUseSWR).not.toHaveBeenCalled()
  expect(mockUsePlayerStore).not.toHaveBeenCalled()
  expect(mockUseHistoryStore).not.toHaveBeenCalled()
  expect(mockUseDominantColor).not.toHaveBeenCalled()
}

async function renderMyPage() {
  const { default: MyPage } = await import('@/app/my/page')
  render(<MyPage />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MyPage', () => {
  beforeEach(() => {
    vi.resetModules()

    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseHistoryStore.mockReset()
    mockUseSearchParams.mockReset()
    mockUseDominantColor.mockReset()
    mockUseSWR.mockReset()
    mockSWRMutate.mockReset()
    mockRestore.mockReset()
    mockSWRModuleLoaded.mockReset()
    mockAppShellModuleLoaded.mockReset()
    mockTabsModuleLoaded.mockReset()
    mockProfileHeaderModuleLoaded.mockReset()
    mockSongTableModuleLoaded.mockReset()
    mockPlaylistGridModuleLoaded.mockReset()
    mockPlayerStoreModuleLoaded.mockReset()
    mockHistoryStoreModuleLoaded.mockReset()
    mockDominantColorModuleLoaded.mockReset()

    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockUserStore()
    mockUsePlayerStore.mockImplementation((selector) =>
      selector ? selector(makePlayerStore() as unknown as Record<string, unknown>) : makePlayerStore()
    )
    mockUseHistoryStore.mockImplementation((selector) =>
      selector ? selector(makeHistoryStore() as unknown as Record<string, unknown>) : makeHistoryStore()
    )
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    mockUseSWR.mockReturnValue(swrState({ isLoading: true }))
    mockRestore.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('redirects to /login after session restoration without loading protected resources', async () => {
    mockUserStore({
      isLoggedIn: false,
      profile: null,
      hasRestoredSession: true,
    })

    await renderMyPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(mockRestore).not.toHaveBeenCalled()
    expect(screen.getByTestId('my-auth-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('my-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
    expectProtectedResourcesIdle()
  })

  test('shows a light gate while session restoration is pending without loading protected resources', async () => {
    mockUserStore({
      isLoggedIn: false,
      profile: null,
      hasRestoredSession: false,
    })

    await renderMyPage()

    expect(screen.getByTestId('my-session-loading')).toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expect(screen.queryByTestId('my-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
    expectProtectedResourcesIdle()
  })

  test('keeps the light gate first when a stale logged-in flag exists during restore', async () => {
    mockUserStore({
      isLoggedIn: true,
      profile: FAKE_PROFILE,
      hasRestoredSession: false,
    })

    await renderMyPage()

    expect(screen.getByTestId('my-session-loading')).toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expect(screen.queryByTestId('my-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
    expectProtectedResourcesIdle()
  })

  test('renders profile header and tabs skeleton when logged in', async () => {
    await renderMyPage()

    // The page shell + profile header are rendered for a logged-in user.
    expect(await screen.findByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('my-page')).toHaveClass('min-h-full')
    expect(screen.getByTestId('profile-header')).toBeInTheDocument()
    expect(screen.getByText('Kahi Tester')).toBeInTheDocument()

    // Tab triggers are present.
    expect(screen.getByRole('tab', { name: /喜欢/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /最近/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /歌单/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /云盘/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /本地历史/ })).toBeInTheDocument()
  })

  test('does not redirect when user is logged in', async () => {
    await renderMyPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(await screen.findByTestId('my-page')).toBeInTheDocument()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  test('tolerates missing profile counts (0 defaults)', async () => {
    mockUserStore({
      profile: { ...FAKE_PROFILE, follows: undefined, followeds: undefined, listenSongs: undefined },
    })

    await renderMyPage()

    // The page still renders without throwing.
    expect(await screen.findByTestId('my-page')).toBeInTheDocument()
    expect(screen.getByTestId('profile-header')).toBeInTheDocument()
  })
})

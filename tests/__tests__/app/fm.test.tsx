'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

type MockDynamicComponent = React.ComponentType<Record<string, unknown>>
type MockDynamicModule = unknown

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseSWR = vi.fn()
const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockUseUserStore = vi.fn()
const mockUsePlayerStore = vi.fn()
const mockUseDominantColor = vi.fn()
const mockUseReducedMotion = vi.fn()

const mockSWRModuleLoaded = vi.fn()
const mockAppShellModuleLoaded = vi.fn()
const mockFMMainPlayerModuleLoaded = vi.fn()
const mockPlayerStoreModuleLoaded = vi.fn()
const mockDominantColorModuleLoaded = vi.fn()
const mockReducedMotionModuleLoaded = vi.fn()

const mockPersonalFm = vi.fn()
const mockFmTrash = vi.fn()
const mockRestore = vi.fn()

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

vi.mock('@/hooks/useReducedMotion', () => {
  mockReducedMotionModuleLoaded()
  return {
    useReducedMotion: () => mockUseReducedMotion(),
  }
})

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseUserStore(selector) : mockUseUserStore(),
}))

vi.mock('@/stores/playerStore', () => {
  mockPlayerStoreModuleLoaded()
  return {
    usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? mockUsePlayerStore(selector) : mockUsePlayerStore(),
  }
})

vi.mock('@/lib/api', () => ({
  ncmApi: {
    personalFm: mockPersonalFm,
    fmTrash: mockFmTrash,
  },
}))

vi.mock('@/components/layout/AppShell', () => {
  mockAppShellModuleLoaded()
  return {
    AppShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'app-shell' }, children),
  }
})

vi.mock('@/components/fm/FMMainPlayer', async (importOriginal) => {
  mockFMMainPlayerModuleLoaded()
  return await importOriginal<typeof import('@/components/fm/FMMainPlayer')>()
})

vi.mock('@/components/player/PlayerBar', () => ({
  PlayerBar: () => React.createElement('div', { 'data-testid': 'player-bar' }),
}))
vi.mock('@/components/player/PlayerOverlays', () => ({
  PlayerOverlays: () => null,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FM_SONG = {
  id: 42,
  name: 'FM Track',
  ar: [{ id: 1, name: 'Artist A' }, { id: 2, name: 'Artist B' }],
  al: { id: 1, name: 'Album A', picUrl: 'https://example.com/fm.jpg' },
  mv: 0,
}

function makeUserStore(overrides: {
  isLoggedIn?: boolean
  hasRestoredSession?: boolean
  restore?: () => Promise<void>
} = {}) {
  return { isLoggedIn: true, hasRestoredSession: true, restore: mockRestore, ...overrides }
}

function makePlayerStore() {
  return {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 200,
    playSong: vi.fn(),
    seek: vi.fn(),
    setIsPlaying: vi.fn(),
  }
}

function swrState<T>(overrides: Partial<{ data: T; error: unknown; isLoading: boolean; mutate: () => void }> = {}) {
  return { data: undefined as T | undefined, isLoading: false, error: null, mutate: vi.fn(), ...overrides }
}

function mockLoggedIn() {
  mockUseUserStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(makeUserStore() as unknown as Record<string, unknown>) : makeUserStore()
  )
}

function mockLoggedOut() {
  mockUseUserStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector
      ? selector(makeUserStore({ isLoggedIn: false }) as unknown as Record<string, unknown>)
      : makeUserStore({ isLoggedIn: false })
  )
}

function mockRestoringSession() {
  mockUseUserStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
    selector
      ? selector(makeUserStore({ hasRestoredSession: false, isLoggedIn: false }) as unknown as Record<string, unknown>)
      : makeUserStore({ hasRestoredSession: false, isLoggedIn: false })
  )
}

function expectAuthShellIdle() {
  expect(mockSWRModuleLoaded).not.toHaveBeenCalled()
  expect(mockAppShellModuleLoaded).not.toHaveBeenCalled()
  expect(mockUseSWR).not.toHaveBeenCalled()
}

function expectPlayerResourcesIdle() {
  expect(mockFMMainPlayerModuleLoaded).not.toHaveBeenCalled()
  expect(mockPlayerStoreModuleLoaded).not.toHaveBeenCalled()
  expect(mockDominantColorModuleLoaded).not.toHaveBeenCalled()
  expect(mockReducedMotionModuleLoaded).not.toHaveBeenCalled()
  expect(mockUsePlayerStore).not.toHaveBeenCalled()
  expect(mockUseDominantColor).not.toHaveBeenCalled()
  expect(mockUseReducedMotion).not.toHaveBeenCalled()
}

async function renderFMPage() {
  const { default: FMPage } = await import('@/app/fm/page')
  render(<FMPage />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FMPage', () => {
  beforeEach(() => {
    vi.resetModules()

    mockUseSWR.mockReset()
    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseDominantColor.mockReset()
    mockUseReducedMotion.mockReset()
    mockPersonalFm.mockReset()
    mockFmTrash.mockReset()
    mockRestore.mockReset()
    mockSWRModuleLoaded.mockReset()
    mockAppShellModuleLoaded.mockReset()
    mockFMMainPlayerModuleLoaded.mockReset()
    mockPlayerStoreModuleLoaded.mockReset()
    mockDominantColorModuleLoaded.mockReset()
    mockReducedMotionModuleLoaded.mockReset()

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 })
    mockUseReducedMotion.mockReturnValue(false)
    mockUseDominantColor.mockReturnValue({ color: null, isLoading: false, error: null })
    mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? selector(makePlayerStore() as unknown as Record<string, unknown>) : makePlayerStore()
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('redirects to /login when not authenticated without loading protected resources', async () => {
    mockLoggedOut()
    mockUseSWR.mockReturnValue(swrState())

    await renderFMPage()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.getByTestId('fm-auth-gate')).toBeInTheDocument()
    expect(screen.queryByTestId('fm-page')).not.toBeInTheDocument()
    expectAuthShellIdle()
    expectPlayerResourcesIdle()
  })

  test('keeps the FM request disabled while the session is restoring', async () => {
    mockRestoringSession()
    mockUseSWR.mockReturnValue(swrState())

    await renderFMPage()

    expect(screen.getByTestId('fm-session-loading')).toBeInTheDocument()
    expect(screen.getByTestId('fm-session-loading-cover')).not.toHaveClass('animate-pulse')
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expectAuthShellIdle()
    expectPlayerResourcesIdle()
  })

  test('keeps the light gate first when a stale logged-in flag exists during restore', async () => {
    mockUseUserStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector
        ? selector(makeUserStore({ hasRestoredSession: false, isLoggedIn: true }) as unknown as Record<string, unknown>)
        : makeUserStore({ hasRestoredSession: false, isLoggedIn: true })
    )
    mockUseSWR.mockReturnValue(swrState())

    await renderFMPage()

    expect(screen.getByTestId('fm-session-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('fm-page')).not.toBeInTheDocument()
    expect(mockRestore).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expectAuthShellIdle()
    expectPlayerResourcesIdle()
  })

  test('renders loading skeleton while songs are pending', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ isLoading: true }))

    await renderFMPage()

    expect(await screen.findByTestId('app-shell')).toBeInTheDocument()
    expect(await screen.findByTestId('fm-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('fm-skeleton-cover')).toBeInTheDocument()
    expect(screen.getByTestId('fm-skeleton-cover')).not.toHaveClass('animate-pulse')
    expectPlayerResourcesIdle()
  })

  test('renders error state with retry when SWR has an error', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ error: new Error('boom') }))

    await renderFMPage()

    expect(await screen.findByTestId('fm-error')).toBeInTheDocument()
    expect(screen.getByTestId('fm-retry')).toBeInTheDocument()
    expectPlayerResourcesIdle()
  })

  test('renders an empty FM placeholder without mounting player resources', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ data: [] }))

    await renderFMPage()

    expect(await screen.findByTestId('fm-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('fm-main-player')).not.toBeInTheDocument()
    expectPlayerResourcesIdle()
  })

  test('renders the immersive main player with controls when a song is present', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))

    await renderFMPage()

    expect(await screen.findByTestId('fm-main-player')).toBeInTheDocument()
    expect(mockFMMainPlayerModuleLoaded).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('fm-page')).toBeInTheDocument()
    expect(screen.getByTestId('fm-track-title')).toHaveTextContent('FM Track')
    expect(screen.getByTestId('fm-track-artist')).toHaveTextContent('Artist A / Artist B')
    expect(mockUseDominantColor).toHaveBeenCalledWith(
      'https://example.com/fm.jpg?param=96y96',
      { timeoutMs: 4000 }
    )
    const coverImg = screen.getByTestId('fm-cover').querySelector('img') as HTMLImageElement
    expect(coverImg).toHaveAttribute('src', 'https://example.com/fm.jpg?param=93y93')
    expect(screen.getByTestId('fm-vinyl')).toHaveClass('vinyl-disc--paused')

    expect(screen.getByTestId('fm-dislike')).toBeInTheDocument()
    expect(screen.getByTestId('fm-prev')).toBeInTheDocument()
    expect(screen.getByTestId('fm-prev')).toBeDisabled()
    expect(screen.getByTestId('fm-play')).toBeInTheDocument()
    expect(screen.getByTestId('fm-next')).toBeInTheDocument()
    expect(screen.getByTestId('fm-like')).toBeInTheDocument()
    expect(screen.getByTestId('fm-progress')).toBeInTheDocument()
  })

  test('clamps cover size on narrow mobile viewports', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 320 })
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))

    await renderFMPage()

    await waitFor(() => {
      expect(screen.getByTestId('fm-main-player')).toHaveAttribute('data-cover-size', '272')
    })
  })

  test('adds the vinyl animation class only while the FM song is actively playing', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))
    mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector
        ? selector({ ...makePlayerStore(), currentTrack: FM_SONG, isPlaying: true } as unknown as Record<string, unknown>)
        : { ...makePlayerStore(), currentTrack: FM_SONG, isPlaying: true }
    )

    await renderFMPage()

    expect(await screen.findByTestId('fm-main-player')).toHaveAttribute('data-playing', 'true')
    expect(screen.getByTestId('fm-vinyl')).toHaveClass('vinyl-disc--playing')
  })

  test('dislike control invokes fmTrash and triggers a refresh', async () => {
    mockLoggedIn()
    const mutate = vi.fn()
    mockFmTrash.mockResolvedValue({})
    mockUseSWR.mockReturnValue(
      swrState({ data: [FM_SONG], mutate })
    )

    await renderFMPage()

    const dislike = await screen.findByTestId('fm-dislike')
    expect(dislike).toBeInTheDocument()

    fireEvent.click(dislike)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFmTrash).toHaveBeenCalledWith(42)
    expect(mutate).toHaveBeenCalled()
  })

  test('next control refreshes FM without trashing the current song', async () => {
    mockLoggedIn()
    const mutate = vi.fn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG], mutate }))

    await renderFMPage()

    fireEvent.click(await screen.findByTestId('fm-next'))

    expect(mockFmTrash).not.toHaveBeenCalled()
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  test('like control toggles pressed state without trashing or refreshing FM', async () => {
    mockLoggedIn()
    const mutate = vi.fn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG], mutate }))

    await renderFMPage()

    const like = await screen.findByTestId('fm-like')
    expect(like).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(like)

    expect(like).toHaveAttribute('aria-pressed', 'true')
    expect(like).toHaveAttribute('data-state', 'liked')
    expect(mockFmTrash).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  test('play button starts playback when the song is not the current track', async () => {
    mockLoggedIn()
    const playSong = vi.fn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))
    mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector
        ? selector({ ...makePlayerStore(), playSong, currentTrack: null } as unknown as Record<string, unknown>)
        : { ...makePlayerStore(), playSong, currentTrack: null }
    )

    await renderFMPage()

    fireEvent.click(await screen.findByTestId('fm-play'))

    expect(playSong).toHaveBeenCalledWith(FM_SONG)
  })

  test('progress slider dispatches a seek when the value changes', async () => {
    mockLoggedIn()
    const seek = vi.fn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))
    mockUsePlayerStore.mockImplementation((selector?: (s: Record<string, unknown>) => unknown) =>
      selector
        ? selector(
            { ...makePlayerStore(), seek, currentTrack: FM_SONG, currentTime: 12, duration: 200 } as unknown as Record<string, unknown>
          )
        : { ...makePlayerStore(), seek, currentTrack: FM_SONG, currentTime: 12, duration: 200 }
    )

    await renderFMPage()

    const slider = await screen.findByTestId('fm-progress-input') as HTMLInputElement
    expect(slider.value).toBe('12')
    fireEvent.change(slider, { target: { value: '88' } })

    expect(seek).toHaveBeenCalledWith(88)
    expect(screen.getByTestId('fm-current-time')).toHaveTextContent('0:12')
  })
})

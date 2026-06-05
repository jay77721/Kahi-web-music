'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

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

const mockPersonalFm = vi.fn()
const mockFmTrash = vi.fn()

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, back: vi.fn() }),
  }
})

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}))

vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: (...args: unknown[]) => mockUseDominantColor(...args),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUseUserStore(selector) : mockUseUserStore(),
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? mockUsePlayerStore(selector) : mockUsePlayerStore(),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    personalFm: mockPersonalFm,
    fmTrash: mockFmTrash,
  },
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'app-shell' }, children),
}))

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

function makeUserStore(overrides: { isLoggedIn?: boolean; hasRestoredSession?: boolean } = {}) {
  return { isLoggedIn: true, hasRestoredSession: true, ...overrides }
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FMPage', () => {
  beforeEach(() => {
    mockUseSWR.mockReset()
    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    mockUseUserStore.mockReset()
    mockUsePlayerStore.mockReset()
    mockUseDominantColor.mockReset()
    mockUseReducedMotion.mockReset()
    mockPersonalFm.mockReset()
    mockFmTrash.mockReset()

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

  test('redirects to /login when not authenticated', async () => {
    mockLoggedOut()
    mockUseSWR.mockReturnValue(swrState())

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
    expect(screen.queryByTestId('fm-page')).not.toBeInTheDocument()
  })

  test('renders loading skeleton while songs are pending', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ isLoading: true }))

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('fm-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('fm-skeleton-cover')).toBeInTheDocument()
  })

  test('renders error state with retry when SWR has an error', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ error: new Error('boom') }))

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    expect(screen.getByTestId('fm-error')).toBeInTheDocument()
    expect(screen.getByTestId('fm-retry')).toBeInTheDocument()
  })

  test('renders the immersive main player with controls when a song is present', async () => {
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    expect(screen.getByTestId('fm-page')).toBeInTheDocument()
    expect(screen.getByTestId('fm-main-player')).toBeInTheDocument()
    expect(screen.getByTestId('fm-track-title')).toHaveTextContent('FM Track')
    expect(screen.getByTestId('fm-track-artist')).toHaveTextContent('Artist A / Artist B')

    // The five controls are keyboard-reachable buttons.
    expect(screen.getByTestId('fm-dislike')).toBeInTheDocument()
    expect(screen.getByTestId('fm-prev')).toBeInTheDocument()
    expect(screen.getByTestId('fm-play')).toBeInTheDocument()
    expect(screen.getByTestId('fm-next')).toBeInTheDocument()
    expect(screen.getByTestId('fm-like')).toBeInTheDocument()
    expect(screen.getByTestId('fm-progress')).toBeInTheDocument()
  })

  test('clamps cover size on narrow mobile viewports', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 320 })
    mockLoggedIn()
    mockUseSWR.mockReturnValue(swrState({ data: [FM_SONG] }))

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    await waitFor(() => {
      expect(screen.getByTestId('fm-main-player')).toHaveAttribute('data-cover-size', '272')
    })
  })

  test('dislike control invokes fmTrash and triggers a refresh', async () => {
    mockLoggedIn()
    const mutate = vi.fn()
    mockFmTrash.mockResolvedValue({})
    mockUseSWR.mockReturnValue(
      swrState({ data: [FM_SONG], mutate })
    )

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    const dislike = screen.getByTestId('fm-dislike')
    expect(dislike).toBeInTheDocument()

    fireEvent.click(dislike)

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFmTrash).toHaveBeenCalledWith(42)
    expect(mutate).toHaveBeenCalled()
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

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    fireEvent.click(screen.getByTestId('fm-play'))

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

    const { default: FMPage } = await import('@/app/fm/page')
    render(<FMPage />)

    const slider = screen.getByTestId('fm-progress-input') as HTMLInputElement
    expect(slider.value).toBe('12')
    fireEvent.change(slider, { target: { value: '88' } })

    expect(seek).toHaveBeenCalledWith(88)
    expect(screen.getByTestId('fm-current-time')).toHaveTextContent('0:12')
  })
})

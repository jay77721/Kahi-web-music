import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { mockSong } from '@/tests/helpers/mock-data'
import { AppShell } from '@/components/layout/AppShell'

const deferredModuleMocks = vi.hoisted(() => ({
  playerBar: vi.fn(),
  fullScreenPlayer: vi.fn(),
  miniPlayer: vi.fn(),
  playQueue: vi.fn(),
}))

vi.mock('@/components/player/PlayerBar', () => {
  deferredModuleMocks.playerBar()
  return { PlayerBar: () => <div data-testid="player-bar" /> }
})

vi.mock('@/components/player/FullScreenPlayer', () => {
  deferredModuleMocks.fullScreenPlayer()
  return { FullScreenPlayer: () => <div data-testid="full-screen-player" /> }
})

vi.mock('@/components/player/MiniPlayer', () => {
  deferredModuleMocks.miniPlayer()
  return { MiniPlayer: () => <div data-testid="mini-player" /> }
})

vi.mock('@/components/player/PlayQueue', () => {
  deferredModuleMocks.playQueue()
  return { PlayQueue: () => <div data-testid="play-queue-overlay" /> }
})

function setMobileViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === '(max-width: 767px)' ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function resetStores() {
  usePlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    hasUserInteracted: false,
    queue: [],
    queueIndex: 0,
    lyrics: [],
    currentLyricIndex: -1,
    playbackError: null,
  })
  useUIStore.setState({
    fullScreenPlayerOpen: false,
    playQueueOpen: false,
    isMobile: false,
  })
}

function clearDeferredModuleMocks() {
  deferredModuleMocks.playerBar.mockClear()
  deferredModuleMocks.fullScreenPlayer.mockClear()
  deferredModuleMocks.miniPlayer.mockClear()
  deferredModuleMocks.playQueue.mockClear()
}

describe('AppShell', () => {
  beforeEach(() => {
    resetStores()
    setMobileViewport(false)
    clearDeferredModuleMocks()
  })

  afterEach(() => {
    cleanup()
    resetStores()
  })

  test('does not load deferred player modules when no player UI can render', () => {
    render(<AppShell><span>Content</span></AppShell>)

    expect(deferredModuleMocks.playerBar).not.toHaveBeenCalled()
    expect(deferredModuleMocks.fullScreenPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.miniPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.playQueue).not.toHaveBeenCalled()
  })

  test('renders children inside main content', () => {
    render(
      <AppShell>
        <div data-testid="child">Hello</div>
      </AppShell>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  test('exposes a focusable main landmark for skip navigation', () => {
    render(<AppShell><span>Content</span></AppShell>)

    const main = screen.getByRole('main', { name: '主内容' })
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main.className).toContain('pb-[calc(4rem+env(safe-area-inset-bottom))]')
  })

  test('keeps mobile navigation mounted under a responsive CSS guard', () => {
    render(<AppShell><span>Content</span></AppShell>)

    const mobileNav = screen.getByRole('navigation', { name: '移动主导航' })
    expect(mobileNav).toHaveClass('md:hidden')
  })

  test('renders without crashing', () => {
    const { container } = render(<AppShell><span>Content</span></AppShell>)
    expect(container.querySelector('div')).toBeTruthy()
  })

  test('renders header login as a single interactive link', () => {
    const { container } = render(<AppShell><span>Content</span></AppShell>)

    expect(container.querySelector('header a[href="/login"]')).toBeTruthy()
    expect(container.querySelector('header a[href="/login"] button')).toBeNull()
  })

  test('lazy-loads the desktop player bar only after a track exists', async () => {
    usePlayerStore.setState({ currentTrack: mockSong })

    render(<AppShell><span>Content</span></AppShell>)

    expect(await screen.findByTestId('player-bar')).toBeInTheDocument()
    expect(deferredModuleMocks.playerBar).toHaveBeenCalledTimes(1)
    expect(deferredModuleMocks.fullScreenPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.miniPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.playQueue).not.toHaveBeenCalled()
  })

  test('lazy-loads the play queue overlay only after the drawer opens', async () => {
    useUIStore.setState({ playQueueOpen: true })

    render(<AppShell><span>Content</span></AppShell>)

    expect(await screen.findByTestId('play-queue-overlay')).toBeInTheDocument()
    expect(deferredModuleMocks.playQueue).toHaveBeenCalledTimes(1)
    expect(deferredModuleMocks.fullScreenPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.miniPlayer).not.toHaveBeenCalled()
  })

  test('lazy-loads the full-screen player only after it opens with a track', async () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    useUIStore.setState({ fullScreenPlayerOpen: true })

    render(<AppShell><span>Content</span></AppShell>)

    expect(await screen.findByTestId('full-screen-player')).toBeInTheDocument()
    expect(deferredModuleMocks.fullScreenPlayer).toHaveBeenCalledTimes(1)
    expect(deferredModuleMocks.miniPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.playQueue).not.toHaveBeenCalled()
  })

  test('lazy-loads the mini player only after mobile track state is active', async () => {
    setMobileViewport(true)
    usePlayerStore.setState({ currentTrack: mockSong })

    render(<AppShell><span>Content</span></AppShell>)

    expect(await screen.findByTestId('mini-player')).toBeInTheDocument()
    expect(deferredModuleMocks.miniPlayer).toHaveBeenCalledTimes(1)
    expect(deferredModuleMocks.fullScreenPlayer).not.toHaveBeenCalled()
    expect(deferredModuleMocks.playQueue).not.toHaveBeenCalled()
  })
})

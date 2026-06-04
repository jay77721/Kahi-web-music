import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MiniPlayer } from '@/components/player/MiniPlayer'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { mockSong } from '@/tests/helpers/mock-data'

function resetStore() {
  usePlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    hasUserInteracted: false,
    queue: [],
    queueIndex: 0,
    playMode: 'sequential',
    lyrics: [],
    currentLyricIndex: -1,
    playbackError: null,
  })
  useUIStore.setState({
    sidebarOpen: true,
    sidebarWidth: 240,
    fullScreenPlayerOpen: false,
    playQueueOpen: false,
    searchOpen: false,
    theme: 'dark',
    isMobile: false,
  })
  ;(window as unknown as { __playbackCtrl?: unknown }).__playbackCtrl = undefined
}

describe('MiniPlayer', () => {
  beforeEach(() => {
    cleanup()
    resetStore()
  })

  afterEach(() => {
    cleanup()
  })

  test('renders nothing when there is no current track', () => {
    const { container } = render(<MiniPlayer />)
    expect(container.firstChild).toBeNull()
  })

  test('renders track name and artist when a track is set', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    expect(screen.getByText(mockSong.name)).toBeInTheDocument()
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
  })

  test('renders an image when the track has album art', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
    const src = decodeURIComponent(img?.getAttribute('src') || '')
    expect(src).toContain('param=48y48')
  })

  test('does not render an image when album picUrl is empty', () => {
    usePlayerStore.setState({
      currentTrack: { ...mockSong, al: { id: 1, name: 'No Cover', picUrl: '' } },
    })
    render(<MiniPlayer />)
    expect(document.querySelector('img')).toBeNull()
  })

  test('renders a play button when paused', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    render(<MiniPlayer />)
    // Outer container + inner toggle button (both have role="button")
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  test('renders a pause button when playing', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: true })
    render(<MiniPlayer />)
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  test('clicking the toggle button calls the global controller and sets hasUserInteracted', () => {
    const togglePlay = vi.fn()
    ;(window as unknown as { __playbackCtrl: { togglePlay: () => void } }).__playbackCtrl = {
      togglePlay,
    }
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    // The inner toggle button is the second button (after the surface container)
    const button = screen.getAllByRole('button')[1]
    fireEvent.click(button)
    expect(togglePlay).toHaveBeenCalled()
    expect(usePlayerStore.getState().hasUserInteracted).toBe(true)
  })

  test('clicking the toggle button does not throw when no controller exists', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    const button = screen.getAllByRole('button')[1]
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  test('clicking the surface (not the button) opens the full-screen player', () => {
    const setFullScreenPlayerOpen = vi.fn()
    const originalSet = useUIStore.getState().setFullScreenPlayerOpen
    useUIStore.setState({ setFullScreenPlayerOpen })
    usePlayerStore.setState({ currentTrack: mockSong })
    const { container } = render(<MiniPlayer />)
    const surface = container.querySelector('.md\\:hidden') as HTMLElement
    expect(surface).toBeTruthy()
    fireEvent.click(surface)
    expect(setFullScreenPlayerOpen).toHaveBeenCalledWith(true)
    useUIStore.setState({ setFullScreenPlayerOpen: originalSet })
  })

  test('clicking the button does not bubble up to the surface click handler', () => {
    const setFullScreenPlayerOpen = vi.fn()
    const originalSet = useUIStore.getState().setFullScreenPlayerOpen
    useUIStore.setState({ setFullScreenPlayerOpen })
    ;(window as unknown as { __playbackCtrl: { togglePlay: () => void } }).__playbackCtrl = {
      togglePlay: vi.fn(),
    }
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    // The inner toggle button is the second button (after the surface container)
    const button = screen.getAllByRole('button')[1]
    fireEvent.click(button)
    expect(setFullScreenPlayerOpen).not.toHaveBeenCalled()
    useUIStore.setState({ setFullScreenPlayerOpen: originalSet })
  })
})

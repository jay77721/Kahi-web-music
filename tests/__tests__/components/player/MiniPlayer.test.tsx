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
    isMobile: true,
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

  test('renders as a named mini player region when a track is set', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    expect(screen.getByRole('region', { name: '迷你播放器' })).toBeInTheDocument()
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

  test('marks the mini artwork as paused or playing', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    const { rerender } = render(<MiniPlayer />)
    expect(screen.getByTestId('now-playing-artwork')).toHaveClass('now-playing-artwork--paused')
    expect(screen.getByTestId('now-playing-artwork')).toHaveAttribute('data-playing', 'false')

    usePlayerStore.setState({ isPlaying: true })
    rerender(<MiniPlayer />)
    expect(screen.getByTestId('now-playing-artwork')).toHaveClass('now-playing-artwork--playing')
    expect(screen.getByTestId('now-playing-artwork')).toHaveAttribute('data-playing', 'true')
  })

  test('renders a play button when paused', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    render(<MiniPlayer />)
    expect(screen.getByRole('button', { name: `打开全屏播放器：${mockSong.name}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
  })

  test('renders a pause button when playing', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: true })
    render(<MiniPlayer />)
    expect(screen.getByRole('button', { name: `打开全屏播放器：${mockSong.name}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument()
  })

  test('clicking the toggle button calls the global controller and sets hasUserInteracted', () => {
    const togglePlay = vi.fn()
    ;(window as unknown as { __playbackCtrl: { togglePlay: () => void } }).__playbackCtrl = {
      togglePlay,
    }
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    const button = screen.getByRole('button', { name: '播放' })
    fireEvent.click(button)
    expect(togglePlay).toHaveBeenCalled()
    expect(usePlayerStore.getState().hasUserInteracted).toBe(true)
  })

  test('clicking the toggle button does not throw when no controller exists', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    const button = screen.getByRole('button', { name: '播放' })
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  test('clicking the open-fullscreen button opens the full-screen player', () => {
    const setFullScreenPlayerOpen = vi.fn()
    const originalSet = useUIStore.getState().setFullScreenPlayerOpen
    useUIStore.setState({ setFullScreenPlayerOpen })
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    fireEvent.click(screen.getByRole('button', { name: `打开全屏播放器：${mockSong.name}` }))
    expect(setFullScreenPlayerOpen).toHaveBeenCalledWith(true)
    useUIStore.setState({ setFullScreenPlayerOpen: originalSet })
  })

  test('clicking the play button does not open the full-screen player', () => {
    const setFullScreenPlayerOpen = vi.fn()
    const originalSet = useUIStore.getState().setFullScreenPlayerOpen
    useUIStore.setState({ setFullScreenPlayerOpen })
    ;(window as unknown as { __playbackCtrl: { togglePlay: () => void } }).__playbackCtrl = {
      togglePlay: vi.fn(),
    }
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<MiniPlayer />)
    const button = screen.getByRole('button', { name: '播放' })
    fireEvent.click(button)
    expect(setFullScreenPlayerOpen).not.toHaveBeenCalled()
    useUIStore.setState({ setFullScreenPlayerOpen: originalSet })
  })
})

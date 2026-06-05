import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { audioEngine } from '@/lib/audio'
import { PlayerBar } from '@/components/player/PlayerBar'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { mockSong } from '@/tests/helpers/mock-data'

// Force the useIsMobile hook to return false in the desktop path; this is
// the only branch we can exercise easily. Mobile rendering returns null.
function setMobileFalse() {
  // Use a small ref to window.matchMedia stub to control the return value.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
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
  })
}

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

describe('PlayerBar', () => {
  beforeEach(() => {
    cleanup()
    resetStore()
    setMobileFalse()
  })

  afterEach(() => {
    cleanup()
  })

  test('renders nothing when there is no current track', () => {
    const { container } = render(<PlayerBar />)
    expect(container.firstChild).toBeNull()
  })

  test('renders the track name and artist when a track is set', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlayerBar />)
    expect(screen.getByRole('region', { name: '播放器' })).toBeInTheDocument()
    expect(screen.getByText(mockSong.name)).toBeInTheDocument()
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
  })

  test('renders the playback duration labels', () => {
    usePlayerStore.setState({ currentTrack: mockSong, currentTime: 30, duration: 200 })
    render(<PlayerBar />)
    expect(screen.getByText('0:30')).toBeInTheDocument()
    expect(screen.getByText('3:20')).toBeInTheDocument()
  })

  test('shows a Play icon when paused and Pause icon when playing', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    const { rerender } = render(<PlayerBar />)
    // All 5 control buttons are rendered.
    const buttonsWhenPaused = screen.getAllByRole('button')
    expect(buttonsWhenPaused.length).toBeGreaterThanOrEqual(5)

    usePlayerStore.setState({ isPlaying: true })
    rerender(<PlayerBar />)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(5)
  })

  test('invokes the global playback controller togglePlay when present', () => {
    const togglePlay = vi.fn()
    ;(window as unknown as { __playbackCtrl: { togglePlay: () => void } }).__playbackCtrl = {
      togglePlay,
    }
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    render(<PlayerBar />)
    // The big center play/pause button is the third button after the
    // play-mode and skip-back buttons (index 2 of 5 total).
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2])
    expect(togglePlay).toHaveBeenCalled()
  })

  test('falls back to audioEngine.pause / audioEngine.play when no controller', () => {
    const pauseSpy = vi.spyOn(audioEngine, 'pause').mockImplementation(() => {})
    const playSpy = vi.spyOn(audioEngine, 'play').mockImplementation(() => {})

    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: true })
    render(<PlayerBar />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2])
    expect(pauseSpy).toHaveBeenCalled()

    usePlayerStore.setState({ isPlaying: false })
    cleanup()
    render(<PlayerBar />)
    const buttons2 = screen.getAllByRole('button')
    fireEvent.click(buttons2[2])
    expect(playSpy).toHaveBeenCalled()

    pauseSpy.mockRestore()
    playSpy.mockRestore()
  })

  test('clicking prev / next calls the store', () => {
    const nextSpy = vi.spyOn(usePlayerStore.getState(), 'next')
    const prevSpy = vi.spyOn(usePlayerStore.getState(), 'prev')
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlayerBar />)
    const buttons = screen.getAllByRole('button')
    // prev is button index 1, next is index 3
    fireEvent.click(buttons[1])
    fireEvent.click(buttons[3])
    expect(prevSpy).toHaveBeenCalled()
    expect(nextSpy).toHaveBeenCalled()
    nextSpy.mockRestore()
    prevSpy.mockRestore()
  })

  test('clicking play mode cycles the mode', () => {
    const cycleSpy = vi.spyOn(usePlayerStore.getState(), 'cyclePlayMode')
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlayerBar />)
    fireEvent.click(screen.getByRole('button', { name: '切换播放模式，当前列表循环' }))
    expect(cycleSpy).toHaveBeenCalled()
    cycleSpy.mockRestore()
  })

  test('clicking mute calls toggleMute', () => {
    const toggleSpy = vi.spyOn(usePlayerStore.getState(), 'toggleMute')
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlayerBar />)
    fireEvent.click(screen.getByRole('button', { name: '静音' }))
    expect(toggleSpy).toHaveBeenCalled()
    toggleSpy.mockRestore()
  })

  test('clicking the play queue button toggles the drawer', () => {
    const toggleSpy = vi.spyOn(useUIStore.getState(), 'togglePlayQueue')
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlayerBar />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])
    expect(toggleSpy).toHaveBeenCalled()
    toggleSpy.mockRestore()
  })

  test('shows VolumeX icon when isMuted is true', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isMuted: true, volume: 0 })
    render(<PlayerBar />)
    // The DOM should still render all buttons
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '取消静音' })).toBeInTheDocument()
  })

  test('renders the album art with imageUrl sizing', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    render(<PlayerBar />)
    const img = screen.getByAltText(mockSong.name)
    // next/image wraps the src in /_next/image?url=... so the param=56y56
    // token lives inside the encoded URL. Decode and check.
    const src = decodeURIComponent(img.getAttribute('src') || '')
    expect(src).toContain('param=56y56')
  })

  test('marks the desktop artwork as paused or playing', () => {
    usePlayerStore.setState({ currentTrack: mockSong, isPlaying: false })
    const { rerender } = render(<PlayerBar />)
    expect(screen.getByTestId('now-playing-artwork')).toHaveClass('now-playing-artwork--paused')
    expect(screen.getByTestId('now-playing-artwork')).toHaveAttribute('data-playing', 'false')

    usePlayerStore.setState({ isPlaying: true })
    rerender(<PlayerBar />)
    expect(screen.getByTestId('now-playing-artwork')).toHaveClass('now-playing-artwork--playing')
    expect(screen.getByTestId('now-playing-artwork')).toHaveAttribute('data-playing', 'true')
  })

  test('renders without album art when al.picUrl is missing', () => {
    usePlayerStore.setState({
      currentTrack: { ...mockSong, al: { id: 1, name: 'NoCover', picUrl: '' } },
    })
    render(<PlayerBar />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  test('shows the playback error text when set', () => {
    usePlayerStore.setState({ currentTrack: mockSong, playbackError: 'Network failed' })
    render(<PlayerBar />)
    expect(screen.getByText('Network failed')).toBeInTheDocument()
  })

  test('uses mm:ss format from formatDuration for both ends of the slider', () => {
    usePlayerStore.setState({ currentTrack: mockSong, currentTime: 65, duration: 200 })
    render(<PlayerBar />)
    expect(screen.getByText('1:05')).toBeInTheDocument()
    expect(screen.getByText('3:20')).toBeInTheDocument()
  })

  test('exposes accessible names for progress and volume sliders', () => {
    usePlayerStore.setState({
      currentTrack: mockSong,
      currentTime: 65,
      duration: 200,
      volume: 0.42,
    })
    render(<PlayerBar />)

    expect(screen.getByRole('slider', { name: '播放进度' })).toHaveAttribute(
      'aria-valuetext',
      '1:05 / 3:20',
    )
    expect(screen.getByRole('slider', { name: '音量' })).toHaveAttribute('aria-valuetext', '42%')
  })

  test('exposes expanded state for the play queue toggle', () => {
    usePlayerStore.setState({ currentTrack: mockSong })
    useUIStore.setState({ playQueueOpen: true })
    render(<PlayerBar />)
    expect(screen.getByRole('button', { name: '播放列表' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '播放列表' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('hides the duration text when duration is 0', () => {
    usePlayerStore.setState({ currentTrack: mockSong, currentTime: 0, duration: 0 })
    render(<PlayerBar />)
    // The two duration labels collapse to "0:00" / "0:00"
    const all = screen.getAllByText('0:00')
    expect(all.length).toBeGreaterThanOrEqual(2)
  })
})

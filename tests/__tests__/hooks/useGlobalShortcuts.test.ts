import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'

// --- Module mocks (must come before imports) --------------------------------

vi.mock('@/stores/playerStore', () => {
  const playerState = {
    isPlaying: false,
    volume: 0.5,
    setHasUserInteracted: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
  }
  return {
    usePlayerStore: {
      getState: () => playerState,
    },
  }
})

vi.mock('@/stores/uiStore', () => {
  const uiState = {
    fullScreenPlayerOpen: false,
    setFullScreenPlayerOpen: vi.fn(),
  }
  return {
    useUIStore: {
      getState: () => uiState,
    },
  }
})

vi.mock('@/lib/audio', () => ({
  audioEngine: {
    isPlaying: vi.fn(() => false),
    play: vi.fn(),
    pause: vi.fn(),
  },
}))

// Imports must come AFTER the vi.mock calls
import { useGlobalShortcuts, resolveShortcut } from '@/hooks/useGlobalShortcuts'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { audioEngine } from '@/lib/audio'

// --- Helpers ----------------------------------------------------------------

function dispatchKey(key: string, options: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  window.dispatchEvent(event)
  return event
}

// Typed aliases for mock objects resolved at runtime
type PlayerMock = ReturnType<typeof usePlayerStore.getState>
type UIMock = ReturnType<typeof useUIStore.getState>
type AudioMock = typeof audioEngine

// --- Pure resolveShortcut tests --------------------------------------------

describe('resolveShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Space toggles play when audio is paused', () => {
    const player = usePlayerStore.getState() as PlayerMock
    const ui = useUIStore.getState() as UIMock
    const audio = audioEngine as unknown as AudioMock
    ;(audio.isPlaying as ReturnType<typeof vi.fn>).mockReturnValue(false)
    const result = resolveShortcut(' ', player, ui, audio)
    expect(result.handled).toBe(true)
    expect(player.setHasUserInteracted).toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalled()
    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('Space toggles pause when audio is playing', () => {
    const player = usePlayerStore.getState() as PlayerMock
    const ui = useUIStore.getState() as UIMock
    const audio = audioEngine as unknown as AudioMock
    ;(audio.isPlaying as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const result = resolveShortcut(' ', player, ui, audio)
    expect(result.handled).toBe(true)
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('ArrowRight calls next', () => {
    const player = usePlayerStore.getState() as PlayerMock
    const result = resolveShortcut('ArrowRight', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(result.handled).toBe(true)
    expect(player.next).toHaveBeenCalled()
  })

  it('ArrowLeft calls prev', () => {
    const player = usePlayerStore.getState() as PlayerMock
    const result = resolveShortcut('ArrowLeft', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(result.handled).toBe(true)
    expect(player.prev).toHaveBeenCalled()
  })

  it('ArrowUp increases volume by 5%', () => {
    const player = usePlayerStore.getState() as PlayerMock
    player.volume = 0.4
    resolveShortcut('ArrowUp', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(player.setVolume).toHaveBeenCalledWith(expect.closeTo(0.45, 5))
  })

  it('ArrowUp clamps to 1 at max', () => {
    const player = usePlayerStore.getState() as PlayerMock
    player.volume = 0.98
    resolveShortcut('ArrowUp', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(player.setVolume).toHaveBeenCalledWith(1)
  })

  it('ArrowDown decreases volume by 5%', () => {
    const player = usePlayerStore.getState() as PlayerMock
    player.volume = 0.4
    resolveShortcut('ArrowDown', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(player.setVolume).toHaveBeenCalledWith(expect.closeTo(0.35, 5))
  })

  it('ArrowDown clamps to 0 at min', () => {
    const player = usePlayerStore.getState() as PlayerMock
    player.volume = 0.02
    resolveShortcut('ArrowDown', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(player.setVolume).toHaveBeenCalledWith(0)
  })

  it('M toggles mute', () => {
    const player = usePlayerStore.getState() as PlayerMock
    resolveShortcut('m', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(player.toggleMute).toHaveBeenCalled()
  })

  it('M (uppercase) toggles mute', () => {
    const player = usePlayerStore.getState() as PlayerMock
    resolveShortcut('M', player, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(player.toggleMute).toHaveBeenCalled()
  })

  it('F opens fullscreen player when closed', () => {
    const ui = useUIStore.getState() as UIMock
    ui.fullScreenPlayerOpen = false
    resolveShortcut('f', usePlayerStore.getState() as PlayerMock, ui, audioEngine as unknown as AudioMock)
    expect(ui.setFullScreenPlayerOpen).toHaveBeenCalledWith(true)
  })

  it('F closes fullscreen player when open', () => {
    const ui = useUIStore.getState() as UIMock
    ui.fullScreenPlayerOpen = true
    resolveShortcut('F', usePlayerStore.getState() as PlayerMock, ui, audioEngine as unknown as AudioMock)
    expect(ui.setFullScreenPlayerOpen).toHaveBeenCalledWith(false)
  })

  it('Unknown keys return handled=false', () => {
    const result = resolveShortcut('z', usePlayerStore.getState() as PlayerMock, useUIStore.getState() as UIMock, audioEngine as unknown as AudioMock)
    expect(result.handled).toBe(false)
  })
})

// --- useGlobalShortcuts hook tests ------------------------------------------

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    const player = usePlayerStore.getState() as PlayerMock
    player.volume = 0.5
    player.isPlaying = false
    const ui = useUIStore.getState() as UIMock
    ui.fullScreenPlayerOpen = false
    ;(audioEngine.isPlaying as ReturnType<typeof vi.fn>).mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  it('Space calls audioEngine.play when paused', () => {
    renderHook(() => useGlobalShortcuts())
    dispatchKey(' ')
    expect(audioEngine.play).toHaveBeenCalledTimes(1)
    expect(audioEngine.pause).not.toHaveBeenCalled()
  })

  it('Space calls audioEngine.pause when playing', () => {
    ;(audioEngine.isPlaying as ReturnType<typeof vi.fn>).mockReturnValue(true)
    renderHook(() => useGlobalShortcuts())
    dispatchKey(' ')
    expect(audioEngine.pause).toHaveBeenCalledTimes(1)
    expect(audioEngine.play).not.toHaveBeenCalled()
  })

  it('ArrowRight calls player.next', () => {
    renderHook(() => useGlobalShortcuts())
    dispatchKey('ArrowRight')
    expect((usePlayerStore.getState() as PlayerMock).next).toHaveBeenCalledTimes(1)
  })

  it('ArrowLeft calls player.prev', () => {
    renderHook(() => useGlobalShortcuts())
    dispatchKey('ArrowLeft')
    expect((usePlayerStore.getState() as PlayerMock).prev).toHaveBeenCalledTimes(1)
  })

  it('ArrowUp increases volume', () => {
    ;(usePlayerStore.getState() as PlayerMock).volume = 0.4
    renderHook(() => useGlobalShortcuts())
    dispatchKey('ArrowUp')
    expect((usePlayerStore.getState() as PlayerMock).setVolume).toHaveBeenCalledWith(expect.closeTo(0.45, 5))
  })

  it('ArrowDown decreases volume', () => {
    ;(usePlayerStore.getState() as PlayerMock).volume = 0.4
    renderHook(() => useGlobalShortcuts())
    dispatchKey('ArrowDown')
    expect((usePlayerStore.getState() as PlayerMock).setVolume).toHaveBeenCalledWith(expect.closeTo(0.35, 5))
  })

  it('M toggles mute', () => {
    renderHook(() => useGlobalShortcuts())
    dispatchKey('m')
    expect((usePlayerStore.getState() as PlayerMock).toggleMute).toHaveBeenCalledTimes(1)
  })

  it('F toggles fullscreen player', () => {
    renderHook(() => useGlobalShortcuts())
    dispatchKey('f')
    expect((useUIStore.getState() as UIMock).setFullScreenPlayerOpen).toHaveBeenCalledWith(true)
  })

  it('preventDefault is called for handled keys', () => {
    renderHook(() => useGlobalShortcuts())
    const event = dispatchKey(' ')
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not trigger shortcuts when an input is focused', () => {
    renderHook(() => useGlobalShortcuts())
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)

    expect(audioEngine.play).not.toHaveBeenCalled()
    expect(audioEngine.pause).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)

    document.body.removeChild(input)
  })

  it('does not trigger shortcuts when a textarea is focused', () => {
    renderHook(() => useGlobalShortcuts())
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    textarea.dispatchEvent(event)

    expect((usePlayerStore.getState() as PlayerMock).next).not.toHaveBeenCalled()

    document.body.removeChild(textarea)
  })

  it('does not trigger shortcuts when a contenteditable element is focused', () => {
    renderHook(() => useGlobalShortcuts())
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    div.tabIndex = 0
    document.body.appendChild(div)
    div.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'm',
      bubbles: true,
      cancelable: true,
    })
    div.dispatchEvent(event)

    expect((usePlayerStore.getState() as PlayerMock).toggleMute).not.toHaveBeenCalled()

    document.body.removeChild(div)
  })

  it('ignores shortcuts when modifier keys are held', () => {
    renderHook(() => useGlobalShortcuts())
    dispatchKey(' ', { ctrlKey: true })
    dispatchKey(' ', { metaKey: true })
    dispatchKey(' ', { altKey: true })
    expect(audioEngine.play).not.toHaveBeenCalled()
    expect(audioEngine.pause).not.toHaveBeenCalled()
  })

  it('does not trigger when enabled is false', () => {
    renderHook(() => useGlobalShortcuts({ enabled: false }))
    dispatchKey(' ')
    dispatchKey('ArrowRight')
    dispatchKey('m')
    expect(audioEngine.play).not.toHaveBeenCalled()
    expect((usePlayerStore.getState() as PlayerMock).next).not.toHaveBeenCalled()
    expect((usePlayerStore.getState() as PlayerMock).toggleMute).not.toHaveBeenCalled()
  })

  it('removes the keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useGlobalShortcuts())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('responds to dynamic enable/disable updates', () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useGlobalShortcuts({ enabled }),
      { initialProps: { enabled: true } }
    )
    dispatchKey(' ')
    expect(audioEngine.play).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })
    dispatchKey(' ')
    expect(audioEngine.play).toHaveBeenCalledTimes(1)
  })
})

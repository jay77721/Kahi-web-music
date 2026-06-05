'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@/tests/helpers/test-utils'

// Mock the swr module so SWRConfig is available in the test wrapper.
const sharedCache = new Map<string, { data?: unknown; error?: unknown; isValidating?: boolean; isLoading?: boolean }>()
vi.mock('swr', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const fakeMutate = async (key: string, data: unknown) => {
    const entry = sharedCache.get(key) ?? {}
    entry.data = data
    sharedCache.set(key, entry)
    return data
  }
  return {
    ...actual,
    useSWRConfig: () => ({ cache: sharedCache, mutate: fakeMutate }),
    mutate: fakeMutate,
  }
})

// Mock the player store to control what FullScreenPlayer sees
const mockStore = {
  currentTrack: null as null | {
    id: number
    name: string
    ar: { id: number; name: string }[]
    al: { id: number; name: string; picUrl: string }
    mv: number
  },
  isPlaying: false,
  currentTime: 0,
  duration: 200,
  playMode: 'sequential' as const,
  lyrics: [],
  currentLyricIndex: -1,
  next: vi.fn(),
  prev: vi.fn(),
  seek: vi.fn(),
  cyclePlayMode: vi.fn(),
  setHasUserInteracted: vi.fn(),
}

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector?: (state: typeof mockStore) => unknown) => (
    selector ? selector(mockStore) : mockStore
  ),
}))

const mockUI = {
  fullScreenPlayerOpen: false,
  setFullScreenPlayerOpen: vi.fn(),
}
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector?: (state: typeof mockUI) => unknown) => (
    selector ? selector(mockUI) : mockUI
  ),
}))

// Stub the dynamic-color hook so we can assert what FullScreenPlayer feeds it
const useDominantColorSpy = vi.fn<(_url?: string | null) => { color: { r: number; g: number; b: number; hex: string; oklch: string } | null; isLoading: boolean; error: Error | null }>()
useDominantColorSpy.mockReturnValue({ color: null, isLoading: false, error: null })
vi.mock('@/hooks/useDominantColor', () => ({
  useDominantColor: (url: string | null | undefined) => useDominantColorSpy(url),
}))

// Stub the audio analyser hook — jsdom has no WebAudio context.
const useAudioAnalyserSpy = vi.fn(() => ({ analyser: null, frequencyData: null, isActive: false }))
vi.mock('@/hooks/useAudioAnalyser', () => ({
  useAudioAnalyser: () => useAudioAnalyserSpy(),
}))

// Stub the spectrum visualizer to a thin span so jsdom doesn't try to
// execute the canvas 2D rendering path.
vi.mock('@/components/player/SpectrumVisualizer', () => ({
  SpectrumVisualizer: () => <div data-testid="spectrum-visualizer-stub" />,
}))

import { FullScreenPlayer } from '@/components/player/FullScreenPlayer'

describe('FullScreenPlayer', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockStore.currentTrack = null
    mockStore.isPlaying = false
    mockStore.currentTime = 0
    mockStore.lyrics = []
    mockStore.currentLyricIndex = -1
    mockUI.fullScreenPlayerOpen = false
  })

  afterEach(() => {
    cleanup()
  })

  test('renders nothing when fullScreenPlayerOpen is false', () => {
    const { container } = render(<FullScreenPlayer />)
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when there is no current track', () => {
    mockUI.fullScreenPlayerOpen = true
    mockStore.currentTrack = null
    const { container } = render(<FullScreenPlayer />)
    expect(container.firstChild).toBeNull()
  })

  test('renders as a modal dialog and moves focus into the overlay when opened', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    mockUI.fullScreenPlayerOpen = true
    mockStore.currentTrack = {
      id: 1,
      name: 'Test',
      ar: [{ id: 1, name: 'Artist' }],
      al: { id: 1, name: 'Album', picUrl: 'https://example.com/cover.jpg' },
      mv: 0,
    }

    render(<FullScreenPlayer />)

    const dialog = screen.getByRole('dialog', { name: '全屏播放器' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
  })

  test('closes the modal dialog when Escape is pressed', () => {
    mockUI.fullScreenPlayerOpen = true
    mockStore.currentTrack = {
      id: 1,
      name: 'Test',
      ar: [{ id: 1, name: 'Artist' }],
      al: { id: 1, name: 'Album', picUrl: 'https://example.com/cover.jpg' },
      mv: 0,
    }
    render(<FullScreenPlayer />)

    fireEvent.keyDown(screen.getByRole('dialog', { name: '全屏播放器' }), { key: 'Escape' })

    expect(mockUI.setFullScreenPlayerOpen).toHaveBeenCalledWith(false)
  })

  test('passes the cover URL to useDominantColor when opened with a track', () => {
    mockUI.fullScreenPlayerOpen = true
    mockStore.currentTrack = {
      id: 1,
      name: 'Test',
      ar: [{ id: 1, name: 'Artist' }],
      al: { id: 1, name: 'Album', picUrl: 'https://example.com/cover.jpg' },
      mv: 0,
    }
    useDominantColorSpy.mockReturnValue({
      color: { r: 30, g: 215, b: 96, hex: '#1ed760', oklch: 'oklch(0.7 0.2 145)' },
      isLoading: false,
      error: null,
    })
    render(<FullScreenPlayer />)
    // The hook must be called with a URL that contains the picUrl
    const calledWith = useDominantColorSpy.mock.calls[0]?.[0]
    expect(calledWith).toBeTruthy()
    expect(String(calledWith)).toContain('example.com/cover.jpg')
  })

  test('does not call useDominantColor with a URL when track has no album art', () => {
    mockUI.fullScreenPlayerOpen = true
    mockStore.currentTrack = {
      id: 1,
      name: 'Test',
      ar: [],
      al: { id: 1, name: 'Album', picUrl: '' },
      mv: 0,
    }
    render(<FullScreenPlayer />)
    // The first non-null argument should be falsy when there's no cover URL
    const firstCallUrl = useDominantColorSpy.mock.calls[0]?.[0]
    expect(firstCallUrl).toBeFalsy()
  })
})

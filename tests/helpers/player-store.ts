import { vi } from 'vitest'
import { usePlayerStore } from '@/stores/playerStore'
import type { Song } from '@/types/song'

export interface MockPlayerStoreState {
  playSong: ReturnType<typeof vi.fn>
  playQueue: ReturnType<typeof vi.fn>
  addToQueue: ReturnType<typeof vi.fn>
  currentTrack: Song | null
  isPlaying: boolean
}

export function createMockPlayerStore(overrides: Partial<MockPlayerStoreState> = {}): MockPlayerStoreState {
  return {
    playSong: vi.fn(),
    playQueue: vi.fn(),
    addToQueue: vi.fn(),
    currentTrack: null,
    isPlaying: false,
    ...overrides,
  }
}

export function resetMockPlayerStore(store: MockPlayerStoreState) {
  vi.clearAllMocks()
  store.playSong.mockClear()
  store.playQueue.mockClear()
  store.addToQueue.mockClear()
  store.currentTrack = null
  store.isPlaying = false
  ;(usePlayerStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector?: (state: MockPlayerStoreState) => unknown) =>
      typeof selector === 'function' ? selector(store) : store
  )
}

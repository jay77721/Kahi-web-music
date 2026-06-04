import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlayerStore } from '@/stores/playerStore'
import { mockSong } from '@/tests/helpers/mock-data'

function resetStore() {
  localStorage.clear()
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
}

describe('playerStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = usePlayerStore.getState()
      expect(state.currentTrack).toBeNull()
      expect(state.isPlaying).toBe(false)
      expect(state.volume).toBe(0.8)
      expect(state.queue).toEqual([])
      expect(state.playMode).toBe('sequential')
      expect(state.lyrics).toEqual([])
      expect(state.currentLyricIndex).toBe(-1)
      expect(state.playbackError).toBeNull()
    })
  })

  describe('setCurrentTrack', () => {
    it('updates currentTrack', () => {
      usePlayerStore.getState().setCurrentTrack(mockSong)
      expect(usePlayerStore.getState().currentTrack).toBe(mockSong)
    })
  })

  describe('setIsPlaying', () => {
    it('toggles isPlaying', () => {
      usePlayerStore.getState().setIsPlaying(true)
      expect(usePlayerStore.getState().isPlaying).toBe(true)
      usePlayerStore.getState().setIsPlaying(false)
      expect(usePlayerStore.getState().isPlaying).toBe(false)
    })
  })

  describe('setVolume', () => {
    it('updates volume and persists to localStorage', () => {
      usePlayerStore.getState().setVolume(0.5)
      expect(usePlayerStore.getState().volume).toBe(0.5)
      expect(usePlayerStore.getState().isMuted).toBe(false)
      expect(localStorage.getItem('kahi-web-music:player:volume')).toBe('0.5')
    })

    it('sets isMuted when volume is 0', () => {
      usePlayerStore.getState().setVolume(0)
      expect(usePlayerStore.getState().isMuted).toBe(true)
    })
  })

  describe('toggleMute', () => {
    it('flips isMuted', () => {
      expect(usePlayerStore.getState().isMuted).toBe(false)
      usePlayerStore.getState().toggleMute()
      expect(usePlayerStore.getState().isMuted).toBe(true)
      usePlayerStore.getState().toggleMute()
      expect(usePlayerStore.getState().isMuted).toBe(false)
    })
  })

  describe('playSong', () => {
    it('updates queueIndex and sets isPlaying when song already in queue', () => {
      const songA = { ...mockSong, id: 1 }
      const songB = { ...mockSong, id: 2 }
      usePlayerStore.getState().playQueue([songA, songB], 0)

      usePlayerStore.getState().playSong(songB)
      const state = usePlayerStore.getState()
      expect(state.currentTrack).toBe(songB)
      expect(state.queueIndex).toBe(1)
      expect(state.isPlaying).toBe(true)
      expect(state.queue).toHaveLength(2)
    })

    it('appends to queue and updates queueIndex when song not in queue', () => {
      const songA = { ...mockSong, id: 1 }
      const songB = { ...mockSong, id: 2 }
      usePlayerStore.getState().playQueue([songA], 0)

      usePlayerStore.getState().playSong(songB)
      const state = usePlayerStore.getState()
      expect(state.currentTrack).toBe(songB)
      expect(state.queueIndex).toBe(1)
      expect(state.queue).toHaveLength(2)
      expect(state.queue[1]).toBe(songB)
    })
  })

  describe('playQueue', () => {
    it('replaces queue entirely and sets currentTrack', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 1)

      const state = usePlayerStore.getState()
      expect(state.queue).toHaveLength(3)
      expect(state.currentTrack).toBe(songs[1])
      expect(state.queueIndex).toBe(1)
      expect(state.isPlaying).toBe(true)
    })

    it('resets lyrics and currentLyricIndex', () => {
      usePlayerStore.setState({
        lyrics: [{ time: 0, text: 'old' }],
        currentLyricIndex: 0,
      })

      const songs = [{ ...mockSong, id: 1 }]
      usePlayerStore.getState().playQueue(songs, 0)

      const state = usePlayerStore.getState()
      expect(state.lyrics).toEqual([])
      expect(state.currentLyricIndex).toBe(-1)
    })

    it('defaults startIndex to 0', () => {
      const songs = [{ ...mockSong, id: 1 }, { ...mockSong, id: 2 }]
      usePlayerStore.getState().playQueue(songs)

      const state = usePlayerStore.getState()
      expect(state.queueIndex).toBe(0)
      expect(state.currentTrack).toBe(songs[0])
    })
  })

  describe('next', () => {
    it('advances by 1 in sequential mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 0)
      usePlayerStore.getState().next()

      expect(usePlayerStore.getState().queueIndex).toBe(1)
      expect(usePlayerStore.getState().currentTrack).toBe(songs[1])
    })

    it('wraps from last to first in sequential mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 2)
      usePlayerStore.getState().next()

      expect(usePlayerStore.getState().queueIndex).toBe(0)
      expect(usePlayerStore.getState().currentTrack).toBe(songs[0])
    })

    it('stays on same index in repeat-one mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
      ]
      usePlayerStore.getState().playQueue(songs, 1)
      usePlayerStore.getState().setPlayMode('repeat-one')
      usePlayerStore.getState().next()

      expect(usePlayerStore.getState().queueIndex).toBe(1)
      expect(usePlayerStore.getState().currentTrack).toBe(songs[1])
    })

    it('picks random index in shuffle mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 0)
      usePlayerStore.getState().setPlayMode('shuffle')

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.7)

      usePlayerStore.getState().next()
      const state = usePlayerStore.getState()
      expect(state.queueIndex).toBe(Math.floor(0.7 * 3))
      expect(state.isPlaying).toBe(true)

      randomSpy.mockRestore()
    })

    it('does nothing when queue is empty', () => {
      usePlayerStore.getState().next()
      expect(usePlayerStore.getState().queueIndex).toBe(0)
    })
  })

  describe('prev', () => {
    it('goes back by 1 in sequential mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 2)
      usePlayerStore.getState().prev()

      expect(usePlayerStore.getState().queueIndex).toBe(1)
      expect(usePlayerStore.getState().currentTrack).toBe(songs[1])
    })

    it('wraps from 0 to end in sequential mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
      ]
      usePlayerStore.getState().playQueue(songs, 0)
      usePlayerStore.getState().prev()

      expect(usePlayerStore.getState().queueIndex).toBe(1)
      expect(usePlayerStore.getState().currentTrack).toBe(songs[1])
    })

    it('stays on same index in repeat-one mode', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
      ]
      usePlayerStore.getState().playQueue(songs, 1)
      usePlayerStore.getState().setPlayMode('repeat-one')
      usePlayerStore.getState().prev()

      expect(usePlayerStore.getState().queueIndex).toBe(1)
      expect(usePlayerStore.getState().currentTrack).toBe(songs[1])
    })

    it('does nothing when queue is empty', () => {
      usePlayerStore.getState().prev()
      expect(usePlayerStore.getState().queueIndex).toBe(0)
    })
  })

  describe('seek', () => {
    it('updates currentTime', () => {
      usePlayerStore.getState().seek(42)
      expect(usePlayerStore.getState().currentTime).toBe(42)
    })
  })

  describe('cyclePlayMode', () => {
    it('cycles through all play modes', () => {
      expect(usePlayerStore.getState().playMode).toBe('sequential')
      usePlayerStore.getState().cyclePlayMode()
      expect(usePlayerStore.getState().playMode).toBe('shuffle')
      usePlayerStore.getState().cyclePlayMode()
      expect(usePlayerStore.getState().playMode).toBe('repeat-one')
      usePlayerStore.getState().cyclePlayMode()
      expect(usePlayerStore.getState().playMode).toBe('repeat-all')
      usePlayerStore.getState().cyclePlayMode()
      expect(usePlayerStore.getState().playMode).toBe('sequential')
    })
  })

  describe('addToQueue', () => {
    it('skips duplicate song id', () => {
      const song = { ...mockSong, id: 1 }
      usePlayerStore.getState().playQueue([song], 0)
      usePlayerStore.getState().addToQueue(song)

      expect(usePlayerStore.getState().queue).toHaveLength(1)
    })

    it('appends new song', () => {
      const songA = { ...mockSong, id: 1 }
      const songB = { ...mockSong, id: 2 }
      usePlayerStore.getState().playQueue([songA], 0)
      usePlayerStore.getState().addToQueue(songB)

      expect(usePlayerStore.getState().queue).toHaveLength(2)
      expect(usePlayerStore.getState().queue[1]).toBe(songB)
    })
  })

  describe('removeFromQueue', () => {
    it('decrements queueIndex when removing index before queueIndex', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 2)
      usePlayerStore.getState().removeFromQueue(0)

      expect(usePlayerStore.getState().queueIndex).toBe(1)
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    })

    it('adjusts queueIndex when removing index at queueIndex', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 1)
      usePlayerStore.getState().removeFromQueue(1)

      const state = usePlayerStore.getState()
      expect(state.queueIndex).toBe(1)
      expect(state.queue).toHaveLength(2)
    })

    it('leaves queueIndex unchanged when removing index after queueIndex', () => {
      const songs = [
        { ...mockSong, id: 1 },
        { ...mockSong, id: 2 },
        { ...mockSong, id: 3 },
      ]
      usePlayerStore.getState().playQueue(songs, 0)
      usePlayerStore.getState().removeFromQueue(2)

      expect(usePlayerStore.getState().queueIndex).toBe(0)
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    })
  })

  describe('clearQueue', () => {
    it('empties queue and resets currentTrack and isPlaying', () => {
      const songs = [{ ...mockSong, id: 1 }, { ...mockSong, id: 2 }]
      usePlayerStore.getState().playQueue(songs, 0)
      usePlayerStore.getState().setIsPlaying(true)

      usePlayerStore.getState().clearQueue()

      const state = usePlayerStore.getState()
      expect(state.queue).toEqual([])
      expect(state.queueIndex).toBe(0)
      expect(state.currentTrack).toBeNull()
      expect(state.isPlaying).toBe(false)
    })
  })

  describe('playbackError', () => {
    it('setPlaybackError sets the error', () => {
      usePlayerStore.getState().setPlaybackError('Network failed')
      expect(usePlayerStore.getState().playbackError).toBe('Network failed')
    })

    it('clearPlaybackError clears the error', () => {
      usePlayerStore.getState().setPlaybackError('Network failed')
      usePlayerStore.getState().clearPlaybackError()
      expect(usePlayerStore.getState().playbackError).toBeNull()
    })
  })

  describe('lyrics', () => {
    it('setLyrics updates lyrics', () => {
      const lyrics = [
        { time: 0, text: 'line 1' },
        { time: 5, text: 'line 2' },
      ]
      usePlayerStore.getState().setLyrics(lyrics)
      expect(usePlayerStore.getState().lyrics).toBe(lyrics)
    })

    it('setCurrentLyricIndex updates currentLyricIndex', () => {
      usePlayerStore.getState().setCurrentLyricIndex(2)
      expect(usePlayerStore.getState().currentLyricIndex).toBe(2)
    })
  })
})

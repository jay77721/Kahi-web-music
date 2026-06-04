import { create } from 'zustand'
import type { Song } from '@/types/song'
import type { PlayMode } from '@/types/api'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { audioEngine } from '@/lib/audio'
import { useHistoryStore } from './historyStore'

interface PlayerState {
  // Current track
  currentTrack: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  hasUserInteracted: boolean

  // Queue
  queue: Song[]
  queueIndex: number

  // Play mode
  playMode: PlayMode

  // Lyrics
  lyrics: { time: number; text: string; translation?: string }[]
  currentLyricIndex: number

  // Error state
  playbackError: string | null

  // Actions
  setCurrentTrack: (song: Song) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void

  playSong: (song: Song) => void
  playQueue: (songs: Song[], startIndex?: number) => void
  onPlaySong: (song: Song) => void
  pause: () => void
  resume: () => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void

  setPlaybackError: (error: string | null) => void
  clearPlaybackError: () => void

  setPlayMode: (mode: PlayMode) => void
  cyclePlayMode: () => void

  addToQueue: (song: Song) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void

  setLyrics: (lyrics: { time: number; text: string; translation?: string }[]) => void
  setCurrentLyricIndex: (index: number) => void
  setHasUserInteracted: () => void

  restorePlayerState: () => void
}

const playModeOrder: PlayMode[] = ['sequential', 'shuffle', 'repeat-one', 'repeat-all']

export const usePlayerStore = create<PlayerState>((set, get) => ({
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

  setCurrentTrack: (song) => set({ currentTrack: song }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => {
    set({ volume, isMuted: volume === 0 })
    storage.set(STORAGE_KEYS.VOLUME, volume)
    audioEngine.setVolume(volume)
  },
  toggleMute: () => {
    const { isMuted, volume } = get()
    const newMuted = !isMuted
    set({ isMuted: newMuted })
    if (newMuted) {
      audioEngine.setVolume(0)
    } else {
      // Restore to the actual engine volume if our tracked volume is 0,
      // otherwise fall back to the tracked volume.
      const engineVolume = audioEngine.getVolume()
      const restoreVolume = volume > 0 ? volume : engineVolume > 0 ? engineVolume : 0.8
      audioEngine.setVolume(restoreVolume)
      if (volume === 0) {
        set({ volume: restoreVolume, isMuted: false })
        storage.set(STORAGE_KEYS.VOLUME, restoreVolume)
      }
    }
  },

  playSong: (song) => {
    const { queue } = get()
    try { useHistoryStore.getState().add(song) } catch { /* history persistence is non-critical */ }
    const existIndex = queue.findIndex(s => s.id === song.id)
    if (existIndex >= 0) {
      set({ currentTrack: song, queueIndex: existIndex, isPlaying: true, currentTime: 0, hasUserInteracted: true })
      storage.set(STORAGE_KEYS.PLAY_INDEX, existIndex)
    } else {
      const newQueue = [...queue, song]
      const newIndex = newQueue.length - 1
      set({ currentTrack: song, queue: newQueue, queueIndex: newIndex, isPlaying: true, currentTime: 0, hasUserInteracted: true })
      storage.set(STORAGE_KEYS.PLAY_QUEUE, newQueue)
      storage.set(STORAGE_KEYS.PLAY_INDEX, newIndex)
    }
  },

  onPlaySong: (song) => {
    // Same as playSong — kept for backward compatibility with existing callers
    get().playSong(song)
  },

  playQueue: (songs, startIndex = 0) => {
    const song = songs[startIndex]
    set({
      queue: songs,
      queueIndex: startIndex,
      currentTrack: song || null,
      isPlaying: !!song,
      currentTime: 0,
      lyrics: [],
      currentLyricIndex: -1,
      hasUserInteracted: true,
    })
    storage.set(STORAGE_KEYS.PLAY_QUEUE, songs)
    storage.set(STORAGE_KEYS.PLAY_INDEX, startIndex)
  },

  pause: () => set({ isPlaying: false }),
  resume: () => {
    const { currentTrack } = get()
    if (currentTrack) set({ isPlaying: true })
  },

  togglePlay: () => {
    set({ hasUserInteracted: true })
    if (audioEngine.isPlaying()) {
      audioEngine.pause()
    } else {
      audioEngine.play()
    }
  },

  next: () => {
    const { queue, queueIndex, playMode } = get()
    if (queue.length === 0) return

    let nextIndex: number
    if (playMode === 'repeat-one') {
      nextIndex = queueIndex
    } else if (playMode === 'shuffle') {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else {
      nextIndex = (queueIndex + 1) % queue.length
    }

    const nextSong = queue[nextIndex]
    set({
      currentTrack: nextSong,
      queueIndex: nextIndex,
      isPlaying: true,
      currentTime: 0,
      lyrics: [],
      currentLyricIndex: -1,
      hasUserInteracted: true,
    })
    storage.set(STORAGE_KEYS.PLAY_INDEX, nextIndex)

    // In repeat-one mode the track id does not change, so the PlaybackController
    // effect (which keys on currentTrack.id) won't re-trigger. Restart manually.
    if (playMode === 'repeat-one') {
      audioEngine.seek(0)
      audioEngine.play()
    }
  },

  prev: () => {
    const { queue, queueIndex, playMode } = get()
    if (queue.length === 0) return

    let prevIndex: number
    if (playMode === 'repeat-one') {
      prevIndex = queueIndex
    } else if (playMode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * queue.length)
    } else {
      prevIndex = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1
    }

    const prevSong = queue[prevIndex]
    set({
      currentTrack: prevSong,
      queueIndex: prevIndex,
      isPlaying: true,
      currentTime: 0,
      lyrics: [],
      currentLyricIndex: -1,
      hasUserInteracted: true,
    })
    storage.set(STORAGE_KEYS.PLAY_INDEX, prevIndex)

    // In repeat-one mode the track id does not change, so the PlaybackController
    // effect (which keys on currentTrack.id) won't re-trigger. Restart manually.
    if (playMode === 'repeat-one') {
      audioEngine.seek(0)
      audioEngine.play()
    }
  },

  seek: (time) => {
    set({ currentTime: time })
    audioEngine.seek(time)
  },

  setPlaybackError: (error) => set({ playbackError: error }),
  clearPlaybackError: () => set({ playbackError: null }),

  setPlayMode: (mode) => {
    set({ playMode: mode })
    storage.set(STORAGE_KEYS.PLAY_MODE, mode)
  },

  cyclePlayMode: () => {
    const { playMode } = get()
    const currentIdx = playModeOrder.indexOf(playMode)
    const nextMode = playModeOrder[(currentIdx + 1) % playModeOrder.length]
    set({ playMode: nextMode })
    storage.set(STORAGE_KEYS.PLAY_MODE, nextMode)
  },

  addToQueue: (song) => {
    const { queue } = get()
    if (queue.some(s => s.id === song.id)) return
    const newQueue = [...queue, song]
    set({ queue: newQueue })
    storage.set(STORAGE_KEYS.PLAY_QUEUE, newQueue)
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get()
    const newQueue = queue.filter((_, i) => i !== index)
    let newIndex = queueIndex
    if (index < queueIndex) newIndex--
    else if (index === queueIndex) newIndex = Math.min(newIndex, newQueue.length - 1)
    const finalIndex = Math.max(0, newIndex)
    set({ queue: newQueue, queueIndex: finalIndex })
    storage.set(STORAGE_KEYS.PLAY_QUEUE, newQueue)
    storage.set(STORAGE_KEYS.PLAY_INDEX, finalIndex)
  },

  clearQueue: () => {
    set({ queue: [], queueIndex: 0, currentTrack: null, isPlaying: false })
    storage.set(STORAGE_KEYS.PLAY_QUEUE, [])
    storage.set(STORAGE_KEYS.PLAY_INDEX, 0)
  },

  setLyrics: (lyrics) => set({ lyrics }),
  setCurrentLyricIndex: (index) => set({ currentLyricIndex: index }),
  setHasUserInteracted: () => set({ hasUserInteracted: true }),

  restorePlayerState: () => {
    if (typeof window === 'undefined') return
    const volume = storage.get(STORAGE_KEYS.VOLUME, 0.8) as number
    const queue = storage.get(STORAGE_KEYS.PLAY_QUEUE, []) as Song[]
    const queueIndex = storage.get(STORAGE_KEYS.PLAY_INDEX, 0) as number
    const playMode = storage.get(STORAGE_KEYS.PLAY_MODE, 'sequential') as PlayMode
    set({ volume, queue, queueIndex, playMode })
  },
}))

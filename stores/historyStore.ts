'use client'

import { create } from 'zustand'
import { storage, STORAGE_KEYS } from '@/lib/storage'

import type { Song } from '@/types/song'

const MAX_HISTORY = 100

function loadHistory(): { song: Song; time: number }[] {
  try {
    return storage.get(STORAGE_KEYS.PLAY_HISTORY, [])
  } catch {
    return []
  }
}

interface HistoryState {
  history: { song: Song; time: number }[]
  add: (song: Song) => void
  clear: () => void
  restoreHistory: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],

  add: (song: Song) => {
    const list = get().history.filter((h) => h.song.id !== song.id)
    const next = [{ song, time: Date.now() }, ...list].slice(0, MAX_HISTORY)
    set({ history: next })
    storage.set(STORAGE_KEYS.PLAY_HISTORY, next)
  },

  clear: () => {
    set({ history: [] })
    storage.set(STORAGE_KEYS.PLAY_HISTORY, [])
  },

  restoreHistory: () => {
    if (typeof window === 'undefined') return
    const history = loadHistory()
    if (history.length > 0) set({ history })
  },
}))

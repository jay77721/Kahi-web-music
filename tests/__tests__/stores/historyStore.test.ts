import { describe, test, expect, beforeEach } from 'vitest'
import { useHistoryStore } from '@/stores/historyStore'
import { mockSong } from '@/tests/helpers/mock-data'

function resetHistory() {
  useHistoryStore.setState({ history: [] })
  localStorage.removeItem('kahi-web-music:history:play')
}

describe('historyStore', () => {
  beforeEach(() => {
    resetHistory()
  })

  test('starts with empty history', () => {
    const { history } = useHistoryStore.getState()
    expect(history).toEqual([])
  })

  test('adds a song to history', () => {
    useHistoryStore.getState().add(mockSong)
    const { history } = useHistoryStore.getState()
    expect(history).toHaveLength(1)
    expect(history[0].song.id).toBe(mockSong.id)
    expect(history[0].song.name).toBe(mockSong.name)
    expect(typeof history[0].time).toBe('number')
  })

  test('deduplicates by song id (moves to front)', () => {
    const store = useHistoryStore.getState()
    store.add(mockSong)
    store.add({ ...mockSong, id: 9999, name: 'Another Song' })
    store.add(mockSong) // re-add first song

    const { history } = useHistoryStore.getState()
    expect(history).toHaveLength(2)
    expect(history[0].song.id).toBe(mockSong.id) // moved to front
    expect(history[1].song.id).toBe(9999)
  })

  test('caps history at MAX_HISTORY (100)', () => {
    const store = useHistoryStore.getState()
    for (let i = 0; i < 105; i++) {
      store.add({ ...mockSong, id: i, name: `Song ${i}` })
    }
    const { history } = useHistoryStore.getState()
    expect(history.length).toBeLessThanOrEqual(100)
  })

  test('clear removes all history', () => {
    const store = useHistoryStore.getState()
    store.add(mockSong)
    store.add({ ...mockSong, id: 2, name: 'Song 2' })
    expect(useHistoryStore.getState().history).toHaveLength(2)

    store.clear()
    expect(useHistoryStore.getState().history).toHaveLength(0)
  })

  test('persists to localStorage', () => {
    useHistoryStore.getState().add(mockSong)
    const stored = localStorage.getItem('kahi-web-music:history:play')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed[0].song.id).toBe(mockSong.id)
  })

  test('newest entry is first in list', () => {
    const store = useHistoryStore.getState()
    const song1 = { ...mockSong, id: 1, name: 'First' }
    const song2 = { ...mockSong, id: 2, name: 'Second' }
    const song3 = { ...mockSong, id: 3, name: 'Third' }

    store.add(song1)
    store.add(song2)
    store.add(song3)

    const { history } = useHistoryStore.getState()
    expect(history[0].song.id).toBe(3)
    expect(history[1].song.id).toBe(2)
    expect(history[2].song.id).toBe(1)
  })
})

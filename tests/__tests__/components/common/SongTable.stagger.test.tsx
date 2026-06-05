'use client'

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SongTable } from '@/components/common/SongTable'
import { makeMockSong as makeSong } from '@/tests/helpers/mock-data'
import { createMockPlayerStore, resetMockPlayerStore } from '@/tests/helpers/player-store'

// ---------------------------------------------------------------------------
// Mock the player store
// ---------------------------------------------------------------------------
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn(),
}))

// ---------------------------------------------------------------------------
// The framer-motion mock in tests/helpers/setup.ts renders every motion
// component as a <div data-framer-motion="true" {...rest}>. We use that
// attribute to detect whether the row / container is participating in the
// stagger animation.
// ---------------------------------------------------------------------------

describe('SongTable stagger animation', () => {
  const mockStore = createMockPlayerStore()

  beforeEach(() => {
    resetMockPlayerStore(mockStore)
  })

  // ---- animated=true (default) ----
  describe('when animated is true (default)', () => {
    test('parent list container is rendered as a motion component', () => {
      const { container } = render(<SongTable songs={[makeSong()]} />)
      // Container must be a motion component (carries staggerChildren variants).
      const motionContainers = container.querySelectorAll('[data-framer-motion]')
      expect(motionContainers.length).toBeGreaterThanOrEqual(1)
    })

    test('each row is rendered as a motion component', () => {
      const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })]
      const { container } = render(<SongTable songs={songs} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows.length).toBe(3)
      rows.forEach((row) => {
        expect(row.getAttribute('data-framer-motion')).toBe('true')
      })
    })

    test('container appears before any row in the DOM', () => {
      const { container } = render(<SongTable songs={[makeSong()]} />)
      const motionEls = container.querySelectorAll('[data-framer-motion]')
      const rows = container.querySelectorAll('[data-song-id]')
      expect(motionEls.length).toBeGreaterThan(0)
      expect(rows.length).toBe(1)
      // The container is an ancestor of the row.
      const containerEl = motionEls[0]!
      expect(containerEl.contains(rows[0]!)).toBe(true)
    })

    test('omitting the prop still enables animation (default = true)', () => {
      const { container } = render(<SongTable songs={[makeSong()]} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]!.getAttribute('data-framer-motion')).toBe('true')
    })
  })

  // ---- animated=false ----
  describe('when animated is false', () => {
    test('no element in the rendered tree carries the framer-motion attribute', () => {
      const { container } = render(<SongTable songs={[makeSong()]} animated={false} />)
      const motionEls = container.querySelectorAll('[data-framer-motion]')
      expect(motionEls.length).toBe(0)
    })

    test('rows still render with data-song-id and existing className', () => {
      const { container } = render(
        <SongTable songs={[makeSong({ id: 42 })]} animated={false} />
      )
      const row = container.querySelector('[data-song-id="42"]')
      expect(row).toBeTruthy()
      // Behavior is unchanged: same className, same dblclick handler.
      expect(row).toHaveClass('group')
    })

    test('double-click on a row still calls playSong', () => {
      const song = makeSong({ id: 1 })
      const { container } = render(
        <SongTable songs={[song]} animated={false} />
      )
      const row = container.querySelector('[data-song-id="1"]')!
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      expect(mockStore.playSong).toHaveBeenCalledWith(song)
    })
  })

  // ---- loading/empty states are unaffected ----
  describe('loading and empty states are not animated', () => {
    test('loading state has no motion elements', () => {
      const { container } = render(<SongTable songs={[]} isLoading />)
      expect(container.querySelectorAll('[data-framer-motion]').length).toBe(0)
    })

    test('empty state has no motion elements', () => {
      const { container } = render(<SongTable songs={[]} />)
      expect(container.querySelectorAll('[data-framer-motion]').length).toBe(0)
    })
  })
})

'use client'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const SONG_TABLE_SOURCE = resolve(process.cwd(), 'components/common/SongTable.tsx')
const SONG_TABLE_ROW_SOURCE = resolve(process.cwd(), 'components/common/song-table/SongTableRow.tsx')

describe('SongTable stagger animation', () => {
  const mockStore = createMockPlayerStore()

  beforeEach(() => {
    resetMockPlayerStore(mockStore)
  })

  test('does not import framer-motion in the table or row runtime', () => {
    const tableSource = readFileSync(SONG_TABLE_SOURCE, 'utf8')
    const rowSource = readFileSync(SONG_TABLE_ROW_SOURCE, 'utf8')

    expect(tableSource).not.toContain('framer-motion')
    expect(tableSource).not.toContain('motion.')
    expect(rowSource).not.toContain('framer-motion')
    expect(rowSource).not.toContain('motion.')
  })

  // ---- animated=true (default) ----
  describe('when animated is true (default)', () => {
    test('parent list container uses CSS stagger animation', () => {
      const { container } = render(<SongTable songs={[makeSong()]} />)

      expect(container.querySelector('[role="list"]')).toHaveClass('stagger-children')
      expect(container.querySelector('[data-framer-motion]')).toBeNull()
    })

    test('each row remains a normal list item under the stagger container', () => {
      const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })]
      const { container } = render(<SongTable songs={songs} />)
      const list = container.querySelector('[role="list"]')
      const rows = container.querySelectorAll('[data-song-id]')

      expect(list).toHaveClass('stagger-children')
      expect(rows.length).toBe(3)
      rows.forEach((row) => {
        expect(row).toHaveAttribute('role', 'listitem')
        expect(row).not.toHaveAttribute('data-framer-motion')
        expect(list).toContainElement(row as HTMLElement)
      })
    })

    test('container appears before any row in the DOM', () => {
      const { container } = render(<SongTable songs={[makeSong()]} />)
      const list = container.querySelector('[role="list"]')
      const rows = container.querySelectorAll('[data-song-id]')

      expect(list).toHaveClass('stagger-children')
      expect(rows.length).toBe(1)
      expect(list).toContainElement(rows[0] as HTMLElement)
    })

    test('omitting the prop still enables animation (default = true)', () => {
      const { container } = render(<SongTable songs={[makeSong()]} />)

      expect(container.querySelector('[role="list"]')).toHaveClass('stagger-children')
    })
  })

  // ---- animated=false ----
  describe('when animated is false', () => {
    test('the list skips CSS stagger animation', () => {
      const { container } = render(<SongTable songs={[makeSong()]} animated={false} />)

      expect(container.querySelector('[role="list"]')).not.toHaveClass('stagger-children')
      expect(container.querySelector('[data-framer-motion]')).toBeNull()
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
    test('loading state has no stagger container or motion elements', () => {
      const { container } = render(<SongTable songs={[]} isLoading />)
      expect(container.querySelector('[role="list"]')).toBeNull()
      expect(container.querySelector('[data-framer-motion]')).toBeNull()
    })

    test('empty state has no stagger container or motion elements', () => {
      const { container } = render(<SongTable songs={[]} />)
      expect(container.querySelector('[role="list"]')).toBeNull()
      expect(container.querySelector('[data-framer-motion]')).toBeNull()
    })
  })
})

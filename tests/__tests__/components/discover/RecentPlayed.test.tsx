'use client'

import { afterEach, describe, test, expect, vi, beforeEach } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { RecentPlayed } from '@/components/discover/RecentPlayed'
import { useHistoryStore } from '@/stores/historyStore'
import { usePlayerStore } from '@/stores/playerStore'
import { mockSong } from '@/tests/helpers/mock-data'

type MotionMockProps<TElement> = HTMLAttributes<TElement> & {
  children?: ReactNode
  initial?: unknown
  animate?: unknown
  variants?: unknown
  whileHover?: unknown
  whileTap?: unknown
  transition?: unknown
}

function stripMotionProps<TElement>(props: MotionMockProps<TElement>) {
  const domProps = { ...props }
  delete domProps.initial
  delete domProps.animate
  delete domProps.variants
  delete domProps.whileHover
  delete domProps.whileTap
  delete domProps.transition
  return domProps
}

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: MotionMockProps<HTMLDivElement>) => {
      const { children, ...domProps } = stripMotionProps(props)
      return <div {...domProps}>{children}</div>
    },
    button: (props: MotionMockProps<HTMLButtonElement> & ButtonHTMLAttributes<HTMLButtonElement>) => {
      const { children, ...domProps } = stripMotionProps<HTMLButtonElement>(props)
      return <button {...domProps}>{children}</button>
    },
  },
}))

function makeHistoryEntry(id: number, name: string) {
  return { song: { ...mockSong, id, name }, time: Date.now() - id * 1000 }
}

describe('RecentPlayed', () => {
  beforeEach(() => {
    useHistoryStore.setState({ history: [] })
    localStorage.removeItem('kahi-web-music:history:play')

    // reset player store back to its initial (queue empty)
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      queue: [],
      queueIndex: 0,
    })
  })

  afterEach(() => {
    cleanup()
  })

  // ---- Empty state ----
  describe('empty state', () => {
    test('renders the section heading', () => {
      const { getByText } = render(<RecentPlayed />)
      expect(getByText('最近播放')).toBeTruthy()
    })

    test('shows empty hint when history is empty', () => {
      const { getByText } = render(<RecentPlayed />)
      expect(getByText('还没有播放记录')).toBeTruthy()
      expect(getByText('播放歌曲后会在这里显示')).toBeTruthy()
    })

    test('does not render any list item when empty', () => {
      const { queryAllByRole } = render(<RecentPlayed />)
      expect(queryAllByRole('listitem')).toHaveLength(0)
    })
  })

  // ---- Rendering with history ----
  describe('with history', () => {
    test('renders one item per history entry', () => {
      useHistoryStore.setState({
        history: [
          makeHistoryEntry(1, 'Song One'),
          makeHistoryEntry(2, 'Song Two'),
          makeHistoryEntry(3, 'Song Three'),
        ],
      })

      const { getAllByRole } = render(<RecentPlayed />)
      const items = getAllByRole('listitem')
      expect(items).toHaveLength(3)
    })

    test('displays song titles', () => {
      useHistoryStore.setState({
        history: [makeHistoryEntry(1, '晴天'), makeHistoryEntry(2, '夜曲')],
      })

      const { getByText } = render(<RecentPlayed />)
      expect(getByText('晴天')).toBeTruthy()
      expect(getByText('夜曲')).toBeTruthy()
    })

    test('respects maxItems prop', () => {
      useHistoryStore.setState({
        history: Array.from({ length: 20 }, (_, i) =>
          makeHistoryEntry(i + 1, `Song ${i + 1}`)
        ),
      })

      const { getAllByRole } = render(<RecentPlayed maxItems={5} />)
      expect(getAllByRole('listitem')).toHaveLength(5)
    })

    test('uses default 6 when maxItems omitted', () => {
      useHistoryStore.setState({
        history: Array.from({ length: 20 }, (_, i) =>
          makeHistoryEntry(i + 1, `Song ${i + 1}`)
        ),
      })

      const { getAllByRole } = render(<RecentPlayed />)
      expect(getAllByRole('listitem')).toHaveLength(6)
    })

    test('uses accessible aria-label including the song name', () => {
      useHistoryStore.setState({
        history: [makeHistoryEntry(1, '晴天')],
      })

      const { getByLabelText } = render(<RecentPlayed />)
      expect(getByLabelText('播放 晴天')).toBeTruthy()
    })

    test('marks cover images for async decoding', () => {
      useHistoryStore.setState({
        history: [makeHistoryEntry(1, 'Async Cover')],
      })

      const { container } = render(<RecentPlayed />)
      const image = container.querySelector('img')
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('decoding', 'async')
    })
  })

  // ---- Interaction ----
  describe('click behavior', () => {
    test('clicking a tile calls playSong with that song', () => {
      const songA = { ...mockSong, id: 1, name: 'A' }
      const songB = { ...mockSong, id: 2, name: 'B' }
      useHistoryStore.setState({
        history: [makeHistoryEntry(1, 'A'), makeHistoryEntry(2, 'B')],
      })
      // ensure deterministic store state for the snapshot
      usePlayerStore.setState({
        currentTrack: null,
        isPlaying: false,
        queue: [],
        queueIndex: 0,
      })

      const { getByLabelText } = render(<RecentPlayed />)
      fireEvent.click(getByLabelText('播放 B'))

      const { currentTrack, isPlaying, queue } = usePlayerStore.getState()
      expect(currentTrack?.id).toBe(songB.id)
      expect(isPlaying).toBe(true)
      expect(queue.find((s) => s.id === songB.id)).toBeTruthy()
      // songA should NOT have been triggered
      expect(queue.find((s) => s.id === songA.id)).toBeUndefined()
    })

    test('clicking a tile does not throw when song is missing cover', () => {
      useHistoryStore.setState({
        history: [
          {
            song: { ...mockSong, id: 7, name: 'No Cover', al: undefined },
            time: Date.now(),
          },
        ],
      })

      const { getByLabelText } = render(<RecentPlayed />)
      expect(() => fireEvent.click(getByLabelText('播放 No Cover'))).not.toThrow()
      expect(usePlayerStore.getState().currentTrack?.id).toBe(7)
    })
  })
})

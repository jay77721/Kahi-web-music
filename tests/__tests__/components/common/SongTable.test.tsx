'use client'

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SongTable } from '@/components/common/SongTable'
import { makeMockSong as makeSong } from '@/tests/helpers/mock-data'
import { createMockPlayerStore, resetMockPlayerStore } from '@/tests/helpers/player-store'

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn(),
}))

type ObserverRecord = {
  callback: IntersectionObserverCallback
  instance: IntersectionObserver
  options?: IntersectionObserverInit
}

function installIntersectionObserverMock() {
  const records: ObserverRecord[] = []
  const originalIntersectionObserver = globalThis.IntersectionObserver

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string
    readonly thresholds: ReadonlyArray<number> = []
    readonly observe = vi.fn()
    readonly unobserve = vi.fn()
    readonly disconnect = vi.fn()
    readonly takeRecords = vi.fn(() => [])

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.rootMargin = options?.rootMargin ?? ''
      records.push({ callback, instance: this, options })
    }
  }

  globalThis.IntersectionObserver = MockIntersectionObserver

  return {
    records,
    restore: () => {
      globalThis.IntersectionObserver = originalIntersectionObserver
    },
  }
}

describe('SongTable', () => {
  const mockStore = createMockPlayerStore()

  beforeEach(() => {
    resetMockPlayerStore(mockStore)
  })

  describe('empty state', () => {
    test('shows empty message when songs array is empty', () => {
      const { container } = render(<SongTable songs={[]} />)
      expect(within(container).getByText('暂无歌曲')).toBeInTheDocument()
    })

    test('does not render play-all button when empty', () => {
      const { container } = render(<SongTable songs={[]} />)
      expect(within(container).queryByText('播放全部')).not.toBeInTheDocument()
    })

    test('does not render table header when empty', () => {
      const { container } = render(<SongTable songs={[]} />)
      expect(within(container).queryByText('#')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    test('renders skeleton rows when isLoading is true', () => {
      const { container } = render(<SongTable songs={[]} isLoading />)
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    test('does not render song rows when loading', () => {
      const { container } = render(<SongTable songs={[makeSong()]} isLoading />)
      expect(container.querySelectorAll('[data-song-id]').length).toBe(0)
    })
  })

  describe('song rendering', () => {
    const songs = [
      makeSong({ id: 1, name: 'Song A', dt: 180000 }),
      makeSong({ id: 2, name: 'Song B', dt: 240000 }),
    ]

    test('renders correct number of song rows', () => {
      const { container } = render(<SongTable songs={songs} />)
      expect(container.querySelectorAll('[data-song-id]').length).toBe(2)
    })

    test('renders song names in data attributes', () => {
      const { container } = render(<SongTable songs={songs} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]).toHaveAttribute('data-song-name', 'Song A')
      expect(rows[1]).toHaveAttribute('data-song-name', 'Song B')
    })

    test('renders duration data attributes', () => {
      const { container } = render(<SongTable songs={songs} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]).toHaveAttribute('data-song-duration', '180000')
      expect(rows[1]).toHaveAttribute('data-song-duration', '240000')
    })

    test('renders artist data attributes', () => {
      const { container } = render(<SongTable songs={songs} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]).toHaveAttribute('data-song-artist', '周杰伦')
    })

    test('renders album data attributes', () => {
      const { container } = render(<SongTable songs={songs} showAlbum />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]).toHaveAttribute('data-song-album', '叶惠美')
    })

    test('renders song pic data attributes', () => {
      const { container } = render(<SongTable songs={songs} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]).toHaveAttribute('data-song-pic', 'https://pics.example.com/album/201.jpg')
    })

    test('can skip row artwork while preserving song metadata', () => {
      const { container } = render(<SongTable songs={songs} showArtwork={false} />)
      expect(within(container).queryByAltText('叶惠美 封面')).not.toBeInTheDocument()
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows[0]).toHaveAttribute('data-song-pic', 'https://pics.example.com/album/201.jpg')
    })

    test('defers artwork after the initial row budget until the row approaches the viewport', () => {
      const observerMock = installIntersectionObserverMock()
      try {
        const { container } = render(
          <SongTable songs={songs} initialArtworkCount={1} animated={false} />
        )
        const rows = container.querySelectorAll('[data-song-id]')

        expect(within(rows[0] as HTMLElement).getByAltText('叶惠美 封面')).toBeInTheDocument()
        expect(within(rows[1] as HTMLElement).queryByAltText('叶惠美 封面')).not.toBeInTheDocument()
        expect(within(rows[1] as HTMLElement).getByTestId('song-row-artwork-placeholder-2')).toBeInTheDocument()
        expect(observerMock.records).toHaveLength(1)
        expect(observerMock.records[0].options).toEqual({ rootMargin: '240px 0px' })

        const secondRow = rows[1] as HTMLElement
        act(() => {
          observerMock.records[0].callback(
            [{ isIntersecting: true, target: secondRow } as unknown as IntersectionObserverEntry],
            observerMock.records[0].instance
          )
        })

        expect(within(secondRow).queryByTestId('song-row-artwork-placeholder-2')).not.toBeInTheDocument()
        expect(within(secondRow).getByAltText('叶惠美 封面')).toBeInTheDocument()
      } finally {
        observerMock.restore()
      }
    })
  })

  describe('header', () => {
    const songs = [
      makeSong({ id: 1, name: 'Song A' }),
      makeSong({ id: 2, name: 'Song B' }),
    ]

    test('shows song count in header', () => {
      render(<SongTable songs={songs} />)
      const countMatches = screen.getAllByText('共 2 首')
      expect(countMatches.length).toBeGreaterThanOrEqual(1)
    })

    test('renders play-all button', () => {
      render(<SongTable songs={songs} />)
      const playAllMatches = screen.getAllByText('播放全部')
      expect(playAllMatches.length).toBeGreaterThanOrEqual(1)
    })

    test('calls playQueue when play-all button is clicked', () => {
      render(<SongTable songs={songs} />)
      const playAllButtons = screen.getAllByText('播放全部')
      fireEvent.click(playAllButtons[0])
      expect(mockStore.playQueue).toHaveBeenCalledTimes(1)
      expect(mockStore.playQueue).toHaveBeenCalledWith(expect.any(Array), 0)
    })

    test('does not render header when no songs', () => {
      const { container } = render(<SongTable songs={[]} />)
      expect(within(container).queryByText('共 0 首')).not.toBeInTheDocument()
      expect(within(container).queryByText('播放全部')).not.toBeInTheDocument()
    })
  })

  describe('selection state', () => {
    const songs = [
      makeSong({ id: 1, name: 'Visible A' }),
      makeSong({ id: 2, name: 'Visible B' }),
    ]

    test('ignores stale selected ids when deriving header checkbox state', () => {
      const { container } = render(
        <SongTable
          songs={songs}
          selectable
          selectedIds={new Set(['stale-a', 'stale-b'])}
        />
      )

      expect(within(container).getByTestId('song-table-select-all')).toHaveAttribute('data-state', 'none')
      expect(within(container).getByTestId('song-row-checkbox-1')).toHaveAttribute('data-state', 'none')
      expect(within(container).getByTestId('song-row-checkbox-2')).toHaveAttribute('data-state', 'none')
    })

    test('counts only visible selected ids for partial selection state', () => {
      const { container } = render(
        <SongTable
          songs={songs}
          selectable
          selectedIds={new Set(['1', 'stale-a'])}
        />
      )

      expect(within(container).getByTestId('song-table-select-all')).toHaveAttribute('data-state', 'partial')
      expect(within(container).getByTestId('song-row-checkbox-1')).toHaveAttribute('data-state', 'all')
      expect(within(container).getByTestId('song-row-checkbox-2')).toHaveAttribute('data-state', 'none')
    })
  })

  describe('index display', () => {
    const songs = [
      makeSong({ id: 1, name: 'First' }),
      makeSong({ id: 2, name: 'Second' }),
      makeSong({ id: 3, name: 'Third' }),
    ]

    test('shows 1-based index padded to 2 digits by default', () => {
      const { container } = render(<SongTable songs={songs} />)
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows.length).toBe(3)
      expect(within(container).getByText('01')).toBeInTheDocument()
      expect(within(container).getByText('02')).toBeInTheDocument()
      expect(within(container).getByText('03')).toBeInTheDocument()
    })

    test('hides index column when showIndex is false', () => {
      const { container } = render(<SongTable songs={songs} showIndex={false} />)
      expect(within(container).queryByText('01')).not.toBeInTheDocument()
    })
  })

  describe('current track highlighting', () => {
    test('applies accent background and left border when song matches currentTrack', () => {
      const currentSong = makeSong({ id: 1, name: 'Current' })
      mockStore.currentTrack = currentSong

      const { container } = render(<SongTable songs={[currentSong]} />)
      const row = container.querySelector('[data-song-id="1"]')
      expect(row).toHaveClass('bg-[var(--bg-accent-subtle)]')
      expect(row).toHaveClass('border-l-2')
      expect(row).toHaveClass('border-[var(--accent)]')
    })

    test('does not apply accent background for non-current songs', () => {
      mockStore.currentTrack = makeSong({ id: 99 })
      const { container } = render(<SongTable songs={[makeSong({ id: 1 })]} />)
      const row = container.querySelector('[data-song-id="1"]')
      expect(row).not.toHaveClass('bg-[var(--bg-accent-subtle)]')
      expect(row).not.toHaveClass('border-[var(--accent)]')
    })
  })

  describe('playing indicator for current track', () => {
    const currentSong = makeSong({ id: 1, name: 'Current' })

    test('replaces index number with playing indicator for current track', () => {
      mockStore.currentTrack = currentSong
      mockStore.isPlaying = true
      const { container } = render(<SongTable songs={[currentSong]} />)
      const row = container.querySelector('[data-song-id="1"]')
      expect(within(row! as HTMLElement).queryByText('01')).not.toBeInTheDocument()
      const indicator = row!.querySelector('.playing-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('playing-indicator--playing')
    })

    test('shows paused playing indicator when current track is not playing', () => {
      mockStore.currentTrack = currentSong
      mockStore.isPlaying = false
      const { container } = render(<SongTable songs={[currentSong]} />)
      const row = container.querySelector('[data-song-id="1"]')
      const indicator = row!.querySelector('.playing-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('playing-indicator--paused')
    })

    test('shows numeric index for non-current tracks', () => {
      mockStore.currentTrack = makeSong({ id: 99 })
      mockStore.isPlaying = true
      const { container } = render(<SongTable songs={[currentSong]} />)
      const row = container.querySelector('[data-song-id="1"]')
      expect(within(row! as HTMLElement).getByText('01')).toBeInTheDocument()
      expect(row!.querySelector('.playing-indicator')).not.toBeInTheDocument()
    })

    test('renders 3 bars inside the playing indicator', () => {
      mockStore.currentTrack = currentSong
      mockStore.isPlaying = true
      const { container } = render(<SongTable songs={[currentSong]} />)
      const row = container.querySelector('[data-song-id="1"]')
      const bars = row!.querySelectorAll('.playing-indicator__bar')
      expect(bars.length).toBe(3)
    })
  })

  describe('actions column', () => {
    test('has no row action buttons when showActions is false and no index', () => {
      const { container } = render(<SongTable songs={[makeSong()]} showActions={false} showIndex={false} />)
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(1)
    })

    test('has play-all plus one index button when showActions is false but showIndex is true', () => {
      const { container } = render(<SongTable songs={[makeSong()]} showActions={false} />)
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(2)
    })
  })

  describe('double-click to play', () => {
    test('calls playSong on double-click', () => {
      const song = makeSong({ id: 1 })
      const { container } = render(<SongTable songs={[song]} />)
      const row = container.querySelector('[data-song-id="1"]')
      fireEvent.doubleClick(row!)
      expect(mockStore.playSong).toHaveBeenCalledWith(song)
    })

    test('renders rows as list items instead of nested row buttons', () => {
      const song = makeSong({ id: 1, name: 'Keyboard Song' })
      const { container } = render(<SongTable songs={[song]} />)
      const row = container.querySelector('[data-song-id="1"]') as HTMLElement

      expect(within(container).getByRole('list', { name: '歌曲列表' })).toContainElement(row)
      expect(row).toHaveAttribute('role', 'listitem')
      expect(row).not.toHaveAttribute('role', 'button')
      expect(row).not.toHaveAttribute('tabindex')

      fireEvent.keyDown(row, { key: 'Enter' })
      fireEvent.keyDown(row, { key: ' ' })
      expect(mockStore.playSong).not.toHaveBeenCalled()
      expect(within(container).getByRole('button', { name: '播放歌曲 Keyboard Song' })).toBeInTheDocument()
    })

    test('plays through the explicit row play button for keyboard users', async () => {
      const user = userEvent.setup()
      const song = makeSong({ id: 1, name: 'Keyboard Song' })
      const { container } = render(<SongTable songs={[song]} />)

      const playButton = within(container).getByRole('button', { name: '播放歌曲 Keyboard Song' })
      playButton.focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')

      expect(mockStore.playSong).toHaveBeenCalledTimes(2)
      expect(mockStore.playSong).toHaveBeenLastCalledWith(song)
    })
  })

  describe('accessibility controls', () => {
    test('exposes accessible names for icon-only row action buttons', () => {
      const song = makeSong({ id: 1, name: 'Named Action Song' })
      render(<SongTable songs={[song]} />)

      expect(screen.getByRole('button', { name: '播放歌曲 Named Action Song' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '添加歌曲 Named Action Song 到播放队列' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开歌曲 Named Action Song 的更多操作菜单' })).toBeInTheDocument()
    })

    test('uses one shared context menu that updates between row triggers', async () => {
      const songs = [
        makeSong({ id: 1, name: 'Menu Song A' }),
        makeSong({ id: 2, name: 'Menu Song B' }),
      ]
      render(<SongTable songs={songs} />)

      fireEvent.click(screen.getByRole('button', { name: '打开歌曲 Menu Song A 的更多操作菜单' }))
      expect(await screen.findByRole('menu', { name: 'Menu Song A 的操作菜单' })).toBeInTheDocument()
      expect(screen.getAllByRole('menu')).toHaveLength(1)

      fireEvent.click(screen.getByRole('button', { name: '打开歌曲 Menu Song B 的更多操作菜单' }))
      expect(await screen.findByRole('menu', { name: 'Menu Song B 的操作菜单' })).toBeInTheDocument()
      expect(screen.queryByRole('menu', { name: 'Menu Song A 的操作菜单' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('menu')).toHaveLength(1)
    })

    test('restores focus to the context menu trigger on Escape', async () => {
      const user = userEvent.setup()
      const song = makeSong({ id: 1, name: 'Focus Menu Song' })
      render(<SongTable songs={[song]} />)

      const trigger = screen.getByRole('button', { name: '打开歌曲 Focus Menu Song 的更多操作菜单' })
      await user.click(trigger)

      const menu = await screen.findByRole('menu', { name: 'Focus Menu Song 的操作菜单' })
      await waitFor(() => expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus())

      await user.keyboard('{Escape}')

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
      expect(trigger).toHaveFocus()
    })

    test('does not steal focus back to the trigger after outside pointer close', async () => {
      const user = userEvent.setup()
      const song = makeSong({ id: 1, name: 'Outside Close Song' })
      render(
        <>
          <button type="button">Outside target</button>
          <SongTable songs={[song]} />
        </>
      )

      const trigger = screen.getByRole('button', { name: '打开歌曲 Outside Close Song 的更多操作菜单' })
      const outsideTarget = screen.getByRole('button', { name: 'Outside target' })
      await user.click(trigger)
      expect(await screen.findByRole('menu', { name: 'Outside Close Song 的操作菜单' })).toBeInTheDocument()

      await user.click(outsideTarget)

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
      expect(outsideTarget).toHaveFocus()
    })
  })

  describe('className passthrough', () => {
    test('applies custom className to root container', () => {
      const { container } = render(<SongTable songs={[makeSong()]} className="my-custom-class" />)
      const root = container.querySelector('.my-custom-class')
      expect(root).toBeTruthy()
    })
  })
})

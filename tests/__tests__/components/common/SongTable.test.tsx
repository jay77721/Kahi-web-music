'use client'

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SongTable } from '@/components/common/SongTable'
import { usePlayerStore } from '@/stores/playerStore'
import { mockSong } from '@/tests/helpers/mock-data'

// ---------------------------------------------------------------------------
// Mock the player store
// ---------------------------------------------------------------------------
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn(),
}))

function makeSong(overrides: Partial<typeof mockSong> = {}): typeof mockSong {
  return { ...mockSong, ...overrides } as typeof mockSong
}

describe('SongTable', () => {
  const mockStore = {
    playSong: vi.fn(),
    playQueue: vi.fn(),
    addToQueue: vi.fn(),
    currentTrack: null as typeof mockSong | null,
    isPlaying: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.playSong.mockClear()
    mockStore.playQueue.mockClear()
    mockStore.addToQueue.mockClear()
    mockStore.currentTrack = null
    mockStore.isPlaying = false
    ;(usePlayerStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore)
  })

  // ---- Empty state ----
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

  // ---- Loading state ----
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

  // ---- Song rendering ----
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
  })

  // ---- Header ----
  describe('header', () => {
    const songs = [
      makeSong({ id: 1, name: 'Song A' }),
      makeSong({ id: 2, name: 'Song B' }),
    ]

    test('shows song count in header', () => {
      render(<SongTable songs={songs} />)
      // "共 2 首" should appear in the header (not in context menu)
      const countMatches = screen.getAllByText(/共 2 首/)
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

  // ---- Index display ----
  describe('index display', () => {
    const songs = [
      makeSong({ id: 1, name: 'First' }),
      makeSong({ id: 2, name: 'Second' }),
      makeSong({ id: 3, name: 'Third' }),
    ]

    test('shows 1-based index padded to 2 digits by default', () => {
      const { container } = render(<SongTable songs={songs} />)
      // Count data-song-id rows to verify 3 songs rendered
      const rows = container.querySelectorAll('[data-song-id]')
      expect(rows.length).toBe(3)
      // Verify index text appears
      expect(within(container).getByText('01')).toBeInTheDocument()
      expect(within(container).getByText('02')).toBeInTheDocument()
      expect(within(container).getByText('03')).toBeInTheDocument()
    })

    test('hides index column when showIndex is false', () => {
      const { container } = render(<SongTable songs={songs} showIndex={false} />)
      expect(within(container).queryByText('01')).not.toBeInTheDocument()
    })
  })

  // ---- Current track highlighting ----
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

  // ---- Playing indicator ----
  describe('playing indicator for current track', () => {
    const currentSong = makeSong({ id: 1, name: 'Current' })

    test('replaces index number with playing indicator for current track', () => {
      mockStore.currentTrack = currentSong
      mockStore.isPlaying = true
      const { container } = render(<SongTable songs={[currentSong]} />)
      const row = container.querySelector('[data-song-id="1"]')
      expect(within(row!).queryByText('01')).not.toBeInTheDocument()
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
      expect(within(row!).getByText('01')).toBeInTheDocument()
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

  // ---- Actions column ----
  describe('actions column', () => {
    test('has no row action buttons when showActions is false and no index', () => {
      const { container } = render(<SongTable songs={[makeSong()]} showActions={false} showIndex={false} />)
      const buttons = container.querySelectorAll('button')
      // Only the play-all header button remains
      expect(buttons.length).toBe(1)
    })

    test('has play-all plus one index button when showActions is false but showIndex is true', () => {
      const { container } = render(<SongTable songs={[makeSong()]} showActions={false} />)
      const buttons = container.querySelectorAll('button')
      // Play-all button in header + index column play button
      expect(buttons.length).toBe(2)
    })
  })

  // ---- Double-click to play ----
  describe('double-click to play', () => {
    test('calls playSong on double-click', () => {
      const song = makeSong({ id: 1 })
      const { container } = render(<SongTable songs={[song]} />)
      const row = container.querySelector('[data-song-id="1"]')
      fireEvent.doubleClick(row!)
      expect(mockStore.playSong).toHaveBeenCalledWith(song)
    })
  })

  // ---- CSS class passthrough ----
  describe('className passthrough', () => {
    test('applies custom className to root container', () => {
      const { container } = render(<SongTable songs={[makeSong()]} className="my-custom-class" />)
      const root = container.querySelector('.my-custom-class')
      expect(root).toBeTruthy()
    })
  })
})
